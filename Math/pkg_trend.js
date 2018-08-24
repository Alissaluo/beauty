// var pkg_trend = require('users/kongdd/public:Math/pkg_trend.js');

// img should only have dependant band
function createConstantBand(img) {
  // img = ee.Image(img);
    return img.addBands(ee.Image.constant(1)).addBands(img.metadata('Year'));
}

function linearTrend(ImgCol, robust){
    if (typeof robust  === 'undefined'){ robust = false; }
    ImgCol = ImgCol.map(createConstantBand)
        .select([1, 2, 0], ['constant', 'Year', 'y']);
    
    var FUN;
    if (robust){
        FUN = ee.Reducer.robustLinearRegression(2, 1);
    }else{
        FUN = ee.Reducer.linearRegression(2, 1);
    }
    var n = ee.Number(ImgCol.size());
    var bandnames = ['offset', 'slope']; 

    var regression = ImgCol.reduce(FUN);
    var coef   = regression.select('coefficients').arrayProject([0]).arrayFlatten([bandnames]);
    // root mean square of the residuals of each dependent variable
    // actually, it is RMSE, not residuals
    var RMSE   = regression.select('residuals').arrayFlatten([['RMSE']]); 
    var offset = coef.select('offset');
    var slope  = coef.select('slope');

    /** try to get the tval to juage regression significant level */
    var Sx = n.multiply(n.add(1)).multiply(n.subtract(1)).divide(12);
    
    var tval, formula = false;
    if (formula){
        // solution1: statistical formula
        ImgCol = ImgCol.map(function(img){
          var pred = img.select(['Year']).multiply(slope).add(offset).rename('pred');
          var re   = img.expression('pow(y - pred, 2)', {NDVI:img.select('y'), pred:pred}).rename('re');
          return img.addBands(pred).addBands(re);
        });
        var Sy = ImgCol.select('re').sum();
        tval = slope.expression('slope/sqrt(Sy/(Sx*(n-2)))', {slope:slope, Sx:Sx, Sy:Sy, n:n}).rename('tval');
    }else{
        // solution2: lazy method
        var adj = n.divide(n.subtract(2)).sqrt();
        tval = RMSE.expression('slope/(b()*adj)*sqrt(Sx)', {slope:slope, Sx:Sx, adj:adj}).rename('tval');
    }
    return coef.addBands(tval);
}

function imgcol_trend(imgcol, band, robust){
    if (typeof band   === 'undefined') {band = 0}
    if (typeof robust === 'undefined') {robust = true}
    
    imgcol = imgcol.select(band).map(function(img){
        img = addSeasonProb(img);      // add seasonal variable
        img = createConstantBand(img); // add constant and Year band
        return img;
    });
    var trend = linearTrend(imgcol, robust); //ee.Image
    return trend;
}

/**
 * [addSeasonProb description]
 *
 * add seasonal variables into img before regression
 * @param {[type]} img [description]
 * @param {boolean} pheno If true, 4-10 as growing season, spring:4-5, summer: 6-8, autumn:9-10
 *                        If false, just as traditional seasons.
 */
function addSeasonProb(img, pheno){
    if (typeof pheno === 'undefined') {pheno = false}
    
    var date  = ee.Date(img.get('system:time_start'));
    var month = date.get('month');
    var year  = date.get('year');
    var season;
    // year.subtract(1).multiply(10).add(4)
    if (pheno){
        /** 4-10 as growing season */
        season = ee.Algorithms.If(month.lte(3), ee.String(year.subtract(1)).cat("_winter"), season);
        season = ee.Algorithms.If(month.gte(4).and(month.lte(5)), ee.String(year).cat("_spring"), season);
        season = ee.Algorithms.If(month.gte(6).and(month.lte(8)), ee.String(year).cat("_summer"), season);
        season = ee.Algorithms.If(month.gte(9).and(month.lte(10)),ee.String(year).cat("_autumn"), season);
        season = ee.Algorithms.If(month.gte(11), ee.String(year).cat("_winter"), season);
    }else{
        /**traditional seasons*/
        season = ee.Algorithms.If(month.lte(2), ee.String(year.subtract(1)).cat("_winter"), season);
        season = ee.Algorithms.If(month.gte(3).and(month.lte(5)), ee.String(year).cat("_spring"), season);
        season = ee.Algorithms.If(month.gte(6).and(month.lte(8)), ee.String(year).cat("_summer"), season);
        season = ee.Algorithms.If(month.gte(9).and(month.lte(11)),ee.String(year).cat("_autumn"), season);
        season = ee.Algorithms.If(month.gte(12), ee.String(year).cat("_winter"), season);
    }
    
    return img.set('Season', season)
        .set('Year', year)
        .set('YearStr', ee.String(year))
        .set('YearMonth', date.format('YYYY-MM')); //seasons.get(month.subtract(1))
}

/** add dn prop to every img */
function add_dn_date(img, beginDate, IncludeYear, n){
    if (typeof IncludeYear === 'undefined') { IncludeYear = true; }
    if (typeof n === 'undefined') { n = 8; }

    beginDate = ee.Date(beginDate);
    var year  = beginDate.get('year');
    var diff  = beginDate.difference(ee.Date.fromYMD(year, 1, 1), 'day').add(1);
    var dn    = diff.subtract(1).divide(n).floor().add(1).int();
    
    year = year.format('%d'); //ee.String(year);
    dn   = dn.format('%02d'); //ee.String(dn);
    dn   = ee.Algorithms.If(IncludeYear, year.cat("-").cat(dn), dn);
    
    return ee.Image(img)
        .set('system:time_start', beginDate.millis())
        // .set('system:time_end', beginDate.advance(1, 'day').millis())
        .set('system:id', beginDate.format('yyyy-MM-dd'))
        .set('dn', dn); //add dn for aggregated into 8days
}

/**
 * return a function used to add dn property
 *
 * @param {boolean} IncludeYear [description]
 */
function add_dn(IncludeYear, n) {
    if (typeof IncludeYear === 'undefined') { IncludeYear = true; }
    if (typeof n === 'undefined') { n = 8; }
    return function(img){
        return add_dn_date(img, img.get('system:time_start'), IncludeYear, n);   
    };
}

function dailyImgIters(beginDate, endDate){
    var daily_iters = ee.List.sequence(beginDate.millis(), endDate.millis(), 86400000)
        .map(function(x) {return ee.Date(x); });
    // var days = daily_iters.length(); 
    /** ImgCols Iters used to select the nearest Imgs */
    var dailyImg_iters = daily_iters.map(function(beginDate){
        return add_dn_date(ee.Image(0), beginDate);
    });
    return dailyImg_iters;
}

/** [hour3Todaily description] */
function hour3Todaily(ImgCol, dailyImg_iters, reducer) {
    if (typeof dailyImg_iters === 'undefined') { 
        var first = ee.Image(ImgCol.first()), 
            last  = imgcol_last(ImgCol);
        var beginDate = ee.Date(first.get('system:time_start')),
            endDate   = ee.Date(last.get('system:time_start'));
        dailyImg_iters = dailyImgIters(beginDate, endDate);
    }
    if (typeof reducer === 'undefined') { reducer = 'mean'; }
    var filterDateEq = ee.Filter.equals({ leftField: 'system:id', rightField: 'system:id' });
    // ee.Join.inner was inappropriate here
    var saveAllJoin = ee.Join.saveAll({
        matchesKey: 'matches',
        ordering: 'system:time_start',
        ascending: true
    });
    var ImgCol_raw = saveAllJoin.apply(dailyImg_iters, ImgCol, filterDateEq)
        .map(function(img) {
            img = ee.Image(img);
            var imgcol = ee.ImageCollection.fromImages(img.get('matches')); //.fromImages
            return imgcol.reduce(reducer)
                .copyProperties(img, ['system:time_start', 'system:id', 'dn']);
        });
    return ee.ImageCollection(ImgCol_raw);
}

function imgcol_addSeasonProb(imgcol){
    return imgcol.map( function(img) { return addSeasonProb(img, false); } );
}

/**
 * aggregate_prop
 *
 * @param  {[type]} ImgCol  [description]
 * @param  {[type]} prop    [description]
 * @param  {[type]} reducer [description]
 * @param  {boolean} delta  If delta = true, reducer will be ignore, and return 
 *                          Just deltaY = y_end - y_begin. (for dataset like GRACE)
 * @return {[type]}         [description]
 */
function aggregate_prop(ImgCol, prop, reducer, delta){
    if (typeof reducer === 'undefined') {reducer = 'mean'}
    if (typeof delta   === 'undefined') {delta   = false}

    var dates = ee.Dictionary(ImgCol.aggregate_histogram(prop)).keys()
    .map(function(p){
        return ee.Image(0).set(prop, p).set('system:id', p);
    });
    // print(dates);
    var filterDateEq = ee.Filter.equals({ leftField : prop, rightField: prop});
    var saveAllJoin = ee.Join.saveAll({
        matchesKey: 'matches',
        ordering  : 'system:time_start',
        ascending : true
    });
    var ImgCol_new = saveAllJoin.apply(dates, ImgCol, filterDateEq)
    // .aside(print)
    .map(function(img){
        img = ee.Image(img);
        var imgcol = ee.ImageCollection.fromImages(img.get('matches')).sort('system:time_start'); //.fromImages

        var first = ee.Image(imgcol.first());
        var last  = imgcol_last(imgcol);
        
        var res = ee.Algorithms.If(delta, last.subtract(first), imgcol.reduce(reducer))
        return ee.Image(res)
            .copyProperties(ee.Image(imgcol.first()), ['Year', 'YearStr', 'YearMonth', 'Season', 'dn', 'system:time_start'])
            .copyProperties(img, ['system:id', prop]);
    });
    return ee.ImageCollection(ImgCol_new);
}

function imgcol_last(imgcol){
    // ee.Image(imgcol_grace.reduce(ee.Reducer.last())); properties are missing
    return ee.Image(imgcol.toList(1, imgcol.size().subtract(1)).get(0));
}

function showdata(ImgCol) {
    ImgCol.filter(filter_date).aside(print);
}

exports = {
    showdata            : showdata,
    addSeasonProb       : addSeasonProb,
    add_dn_date         : add_dn_date,
    add_dn              : add_dn,
    hour3Todaily        : hour3Todaily, 
    aggregate_prop      : aggregate_prop,
    linearTrend         : linearTrend,
    imgcol_trend        : imgcol_trend,
    createConstantBand  : createConstantBand,
    imgcol_addSeasonProb: imgcol_addSeasonProb,
    imgcol_last         : imgcol_last,
};
