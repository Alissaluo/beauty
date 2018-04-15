//var pkg_smooth     = require('users/kongdd/public:Math/pkg_smooth.js')

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
    // var bandNames = ee.Image(yPred.first()).bandNames();
    // var lastband  = bandNames.get(-1);
    // // system:index was combined and can't change. Unknown reason.
    // var re = yPred.map(function(img) {
    //     // first band is original VI
    //     // the last band is smoothed time-series after iters loop
    //     return img.select([0]).subtract(img.select([lastband])).abs()
    //         .copyProperties(img, ['system:id', 'system:index', 'system:time_start']);
    // });
    re = ee.ImageCollection(re);
    var median = re.reduce(ee.Reducer.percentile([50])); 
    var sc = median.multiply(6.0);
    
    var w = re.map(function(res) {
        var img = res.expression('pow(1 - pow(b()/sc, 2), 2)', {sc:sc}); 
        return img.where(res.gte(sc), 0.0)
            .copyProperties(res, ['system:id', 'system:index', 'system:time_start']);
    });
    w = w.toArray().toArray(1);
    return w;
}

/**
 * Reference: https://cn.mathworks.com/help/curvefit/smoothing-data.html#bq_6ys3-3.
 */
function modweight_bisquare_array(re) {
    var median = re.abs().arrayReduce(ee.Reducer.percentile([50]), [0]);
    var sc = median.multiply(6.0).arrayProject([0]).arrayFlatten([['sc']]);
    
    var w = re.expression('pow(1 - pow(b()/sc, 2), 2)', { sc: sc });
    w = w.expression('(re >= sc)*0 + (re < sc) * b()', { sc: sc, re:re.abs() });
    
    return w;
}

exports = {
  setweights         :setweights,
  modweight_bisquare :modweight_bisquare,
};