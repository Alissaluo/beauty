//var pkg_smooth     = require('users/kongdd/public:Math/pkg_smooth.js')
var pkg_trend = require('users/kongdd/public:Math/pkg_trend.js');

function setweights(ImgCol, bound) {
    if (typeof bound === 'undefined') {
        var alpha = 1; //unit: %
        bound = ImgCol.reduce(ee.Reducer.percentile([alpha/2, 100 - alpha/2]));
    } 
    var w = ImgCol.map(function(img) {
        // set weights to be one if points in the VI boundary
        // for LAI, low bound should be big than 0;
        var w = img.multiply(0);
        w = w.where(img.lte(bound.select([1]))
                       .or(img.gte(bound.select([0]).max(0))), 1); 
        // x = ee.Number(x); //ee.Image when using for ImageCollections.
        // set weights of points out of boundary to zero
        // return ee.Algorithms.If(x.gt(bound.get(0)).or(x.lt(bound.get(1))), 1, 0);
        return w;
    });
    w = w.toArray();//.toArray(1);
    // weights must be the same length as frame
    // [1,2,3]→[[1],[2],[3]], cat to 1D is necessary, column vector
    // w = ee.Array.cat([w], 1); // to column vector
    return w;
}

/**
  * Modified weights of each points according to residual
  *
  * @description: Suggest to replaced NA values with a fixed number such as -99.
  * Otherwise, it will introduce a large number of missing values in fitting
  * result, for lowess, moving average, whittaker smoother and Savitzky-Golay
  * filter.
  *
  * Robust weights are given by the bisquare function like lowess function
  * Reference:
  *     https://cn.mathworks.com/help/curvefit/smoothing-data.html#bq_6ys3-3.
  * re = abs(Yobs - Ypred); % residual
  * sc = 6 * median(re);    % overall scale estimate 
  * w  = zeros(size(re)); 
  * % w = ( 1 - ( re / sc ).^2 ).^2;
  * w(re < sc) = ( 1 - ( re(re < sc) / sc ).^2 ).^2; %NAvalues weighting will be zero
  *
  * @param  {ImageCollection}  re  [description]
  * @return {Array}            new weights according to residuals.
  */ 
function modweight_bisquare(re) {
    re = ee.ImageCollection(re);
    var median = re.reduce(ee.Reducer.percentile([50])); 
    var sc = median.multiply(6.0);
    
    var w = re.map(function(res) {
        var img = res.expression('pow(1 - pow(b()/sc, 2), 2)', {sc:sc}); 
        return img.where(res.gte(sc), 0.0)
            .copyProperties(res, ['system:id', 'system:index', 'system:time_start']);
    });
    w = w.toArray();//.toArray(1)
    return w;
}

/**
 * Reference: https://cn.mathworks.com/help/curvefit/smoothing-data.html#bq_6ys3-3.
 */
function modweight_bisquare_array(re, w) {
    var median = re.abs().arrayReduce(ee.Reducer.percentile([50]), [0]);
    
    var sc = median.multiply(6.0).arrayProject([0]).arrayFlatten([['sc']]);
    // Map.addLayer(re, {}, 're')
    // Map.addLayer(sc, {}, 'median')
    
    var w_new = re.expression('pow(1 - pow(b()/sc, 2), 2)', { sc: sc });
        
    if (typeof w !== 'undefined'){
        w_new = w_new.expression('(re <  0) * b() + (re >= 0)*w' , { re:re, w:w });
    }
    w_new = w_new.expression('(re >= sc)*0 + (re < sc) * b()', { sc:sc, re:re.abs() });
    // Map.addLayer(w, {}, 'inside w');
    
    return w_new;
}

/** 
 * [replace_mask description]
 *
 * img.where can't directy replace masked values
 * @param  {[type]} img    [description]
 * @param  {[type]} newimg [description]
 * @return {[type]}        [description]
 */
function replace_mask(img, newimg) {
    img = img.unmask(-999);
    img = img.where(img.eq(-999), newimg);
    img = img.updateMask(img.neq(-999));
    return img;
}

/** all those interpolation functions are just designed for 8-day temporal scale */
function historyInterp(imgcol, prop){
    if (typeof prop === 'undefined') { prop = 'd8'; }
    var imgcol_his = pkg_trend.aggregate_prop(imgcol, prop, 'median');
    
    var f = ee.Filter.equals({leftField:prop, rightField:prop});
    var c = ee.Join.saveAll({matchesKey:'history', ordering:'system:time_start', ascending:true})
        .apply(imgcol, imgcol_his, f);
    
    var interpolated = ee.ImageCollection(c.map(function(img) {
        img = ee.Image(img);
        var history = ee.Image(ee.List(img.get('history')).get(0));
        var props   = img.propertyNames().remove('history');
        img = img.set('history', null);
        var interp  = replace_mask(img, history);
        return interp;//.copyProperties(img, ['system:time_start', 'system:id', prop]);
    }));
    print(interpolated, 'interpolated');
    return interpolated;
}

// good values are modified in the interp. Need to further constrain.
function linearInterp(imgcol, frame){
    if (typeof frame === 'undefined') { frame = 32; }
    // var frame = 32;
    var time   = 'system:time_start';
    imgcol = imgcol.map(addTimeBand);
    
    // We'll look for all images up to 32 days away from the current image.
    var maxDiff = ee.Filter.maxDifference(frame * (1000*60*60*24), time, null, time);
    var cond    = {leftField:time, rightField:time};
    
    // Images after, sorted in descending order (so closest is last).
    //var f1 = maxDiff.and(ee.Filter.lessThanOrEquals(time, null, time))
    var f1 = ee.Filter.and(maxDiff, ee.Filter.lessThanOrEquals(cond));
    var c1 = ee.Join.saveAll({matchesKey:'after', ordering:time, ascending:false})
        .apply(imgcol, imgcol, f1);
    
    // Images before, sorted in ascending order (so closest is last).
    //var f2 = maxDiff.and(ee.Filter.greaterThanOrEquals(time, null, time))
    var f2 = ee.Filter.and(maxDiff, ee.Filter.greaterThanOrEquals(cond));
    var c2 = ee.Join.saveAll({matchesKey:'before', ordering:time, ascending:true})
        .apply(c1, imgcol, f2);
    
    // var img = ee.Image(c2.toList(1, 15).get(0));
    // var mask   = img.select([0]).mask();
    // Map.addLayer(img , {}, 'img');
    // Map.addLayer(mask, {}, 'mask');
    
    var interpolated = ee.ImageCollection(c2.map(function(img) {
        img = ee.Image(img);

        var before = ee.ImageCollection.fromImages(ee.List(img.get('before'))).mosaic();
        var after  = ee.ImageCollection.fromImages(ee.List(img.get('after'))).mosaic();
        
        img = img.set('before', null).set('after', null);
        // constrain after or before no NA values, confirm linear Interp having result
        before = replace_mask(before, after);
        after  = replace_mask(after , before);
        
        // Compute the ratio between the image times.
        var x1 = before.select('time').double();
        var x2 = after.select('time').double();
        var now = ee.Image.constant(img.date().millis()).double();
        var ratio = now.subtract(x1).divide(x2.subtract(x1));  // this is zero anywhere x1 = x2
        // Compute the interpolated image.
        var interp = after.subtract(before).multiply(ratio).add(before);
        // var mask   = img.select([0]).mask();
        
        interp = replace_mask(img, interp);
        // Map.addLayer(interp, {}, 'interp');
        return interp.copyProperties(img, ['system:time_start', 'system:id']);
    }));
    return interpolated;
}

exports = {
    setweights              :setweights,
    modweight_bisquare      : modweight_bisquare,
    modweight_bisquare_array: modweight_bisquare_array,

    replace_mask            : replace_mask,  
    historyInterp           : historyInterp,
    linearInterp            : linearInterp,  
};