/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var imgcol_lai_raw = ee.ImageCollection("projects/pml_evapotranspiration/PML_INPUTS/MODIS/LAI_whit_4d"),
    imgcol_lai_org = ee.ImageCollection("MODIS/006/MCD15A3H");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// var pkg_main   = require('users/kongdd/public:pkg_main.js');
var global_prop = ['system:id', 'system:time_start', 'system:time_end']; //, 'system:index'
var points = require('users/kongdd/public:data/flux_points.js').points;

var addYearProp = function(img) {
    return img.set('year', ee.Date(img.get('system:time_start')).get('year'));
};
var addDateProp = function(img) {
    return img.set('date', ee.Date(img.get('system:time_start')).format('yyyy-MM-dd'));
};

/**
 * setImgProperties 
 * 
 * add properties, i.e., [system:time_start, system:time_end, system:id] to Image
 *           
 * @param {Image}   img       [description]
 * @param {ee.Date} beginDate [description]
 */
function setImgProperties(img, beginDate) {
    beginDate = ee.Date(beginDate);
    return ee.Image(img)
        .set('system:time_start', beginDate.millis())
        // .set('system:time_end', beginDate.advance(1, 'day').millis())
        .set('system:id', beginDate.format('yyyy-MM-dd'));
}

/** get values from image array or imgcol, clipped by region or regions */
function imgRegion(img, region, name){
    var val = ee.Image(img).reduceRegion({reducer:ee.Reducer.toList(), geometry:point, scale:500});
    // val = ee.List(val);
    print(name, val); //.get('L')
    return val;
}

function imgRegions(img, regions, name){
    var val = ee.Image(img).reduceRegions({
        collection:points,
        reducer:ee.Reducer.toList(),
        scale:500, 
        tileScale:16
    })
    .map(function(f){
        var data = ee.List(f.get('list')); //.get(0)
        return ee.Feature(null).copyProperties(f, ['site'])
            .set('data', data);
    });
    
    if (typeof name !== 'undefined'){
        var keys   = val.aggregate_array('site');
        var values = val.aggregate_array('data');
        var dict   = ee.Dictionary.fromLists(keys, values);
        print(name, dict);
        // print(name, val);
    }
    return val;
}

function imgcolRegion(imgcol, region, name){
    var vals = ee.ImageCollection(imgcol).map(function(img){return imgRegion(img, region, name)});
    if (typeof name !== 'undefined'){
        print(name, vals);
    }
    return vals;
}

function imgcolRegions(imgcol, regions, name){
    var vals = ee.ImageCollection(imgcol).map(function(img){return imgRegions(img, regions, name)});
    if (typeof name !== 'undefined'){
        print(name, vals);
    }
    return vals;
}

/**
 * [array2imgcol description]
 *
 * @param  {[type]} mat   [description]
 * @param  {[type]} nrow  [description]
 * @param  {[type]} ncol  [description]
 * @param  {[type]} bands [description]
 * @param  {[type]} dates [description]
 * @return {[type]}       [description]
 */
function array2imgcol(mat, nrow, ncol, bands, dates){
    // var dates   = ee.List(imgcol.aggregate_array('system:time_start'));
    // var indices = ee.List(imgcol.aggregate_array('system:index'));
    mat  = ee.Image(mat);
    nrow = ee.Number(nrow);
    ncol = ee.Number(ncol);
    
    if (typeof bands === 'undefined'){
        bands = ee.List.sequence(1, ncol).map(function(i){
            return ee.String('iter').cat(ee.Number(i).int());
        }).getInfo();
        // print(bands);
    }

    var imgcol_new = ee.List.sequence(0, nrow.subtract(1))
        .map(function(i) {
            i = ee.Number(i).int();
            var beginDate = ee.Date(dates.get(i));
           
            var yi  = mat.arraySlice(0, i, i.add(1));
            var img = yi.arrayProject([1]).arrayFlatten([bands]);
            return pkg_main.setImgProperties(img, beginDate);
            // return img.addBands(whit);
        });
    return ee.ImageCollection(imgcol_new);
    // return pkg_main.setImgProperties(img, beginDate);  
}

/** multiple bands image convert to imgcol */
function bandsToImgCol(img){
    img = ee.Image(img);
    var names = img.bandNames();
    var n     = names.size();
    
    var imgcol = ee.ImageCollection(names.map(function(name){
        var date = ee.Date.parse('YYYY_MM_dd', ee.String(name).slice(1, 11));
        return img.select([name], ['Lai'])
            .set('system:time_start', date.millis())
            // .set('system:time_end', beginDate.advance(1, 'day').millis())
            .set('system:id', date.format('yyyy_MM_dd'))
            .set('system:index', date.format('yyyy_MM_dd'));
    }));
    return imgcol;
}
exports = {
    global_prop     : global_prop,
    addYearProp     : addYearProp,
    addDateProp     : addDateProp,
    setImgProperties: setImgProperties,
    imgRegion       : imgRegion,
    imgRegions      : imgRegions,
    imgcolRegion    : imgcolRegion,
    imgcolRegions   : imgcolRegions,
    array2imgcol    : array2imgcol,
    bandsToImgCol   : bandsToImgCol,
};
