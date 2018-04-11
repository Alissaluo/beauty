// var pkg_join   = require('users/kongdd/pkgs:src/Joins.js');
/** 
 * Use this filter to find the nearest LAI and Albedo, and Emissivity data
 * of meteorological forcing data 
 */
var millis_1d = 86400000; // 24*3600*1000, ms
var maxDiff_9d   = ee.Filter.maxDifference({
    difference: 9 * millis_1d,
    leftField : 'system:time_start',
    rightField: 'system:time_start'
});
var maxDiff_1y = ee.Filter.maxDifference({
    leftField : 'year',
    rightField: 'year',
    difference: 4
});

// Specify an equals filter for image timestamps.
var filterTimeEq = ee.Filter.equals({
    leftField : 'system:time_start',
    rightField: 'system:time_start'
});

/** SaveBest: ee.Join.saveBest ImgCol according to filter, the default filter was filterTimeEq */
var SaveBest = function(primary, secondary, filter) {
    if (typeof filter === 'undefined') filter = filterTimeEq;
    var joinedImgCol = ee.Join.saveBest('matches', 'measure')
        .apply(primary, secondary, filter)
        // .aside(print)
        .map(function(img) { 
            return ee.Image(img).addBands(img.get('matches'))
                .set("matches", null);
                // .copyProperties(img, img.propertyNames().remove('matches'));
        });
    return ee.ImageCollection(joinedImgCol);
};

/** InnerJoin: Join to ImgCol according to filter, the default filter was filterTimeEq */
var InnerJoin = function(primary, secondary, filter, join) {
    if (typeof filter === 'undefined') filter = filterTimeEq;
    if (typeof join   === 'undefined') join   = ee.Join.inner();
    
    // Apply the join.
    var JoinedImgCol_raw = join.apply(primary, secondary, filter);
    // Display the join result: a FeatureCollection.
    // print('Inner join output:', innerJoinedMODIS);

    // Map a function to merge the results in the output FeatureCollection.
    var joinedImgCol = JoinedImgCol_raw.map(function(feature) {
        // return ee.Image.cat(feature.get('primary'), feature.get('secondary'));
        return ee.Image(feature.get('primary')).addBands(feature.get('secondary'));
    });
    return ee.ImageCollection(joinedImgCol);
};

/**
 * Left ImageCollection will apply ImgFun to the right. Firstly ImageCollection 
 * was matched by system:time_start.
 *
 * @param {ImageCollection} primary   [description]
 * @param {ImageCollection} secondary [description]
 * @param {function}        ImgFun    Image manipulating function, such as Img_absdiff
 * @return {ImageCollection}       [description]
 */ 
var ImgColFun = function(primary, secondary, ImgFun){
    // Map a function to merge the results in the output FeatureCollection.
    var joinedImgCol = ee.Join.saveBest('matches', 'measure')
        .apply(primary, secondary, filterTimeEq)
        .map(function(img) { 
            var right = ee.Image(img.get('matches'));
            var left  = img.set('matches', null);
            return ImgFun(left, right)
                .copyProperties(left, left.propertyNames());
        });
    return joinedImgCol;
};

var Img_absdiff = function(left, right){
    return ee.Image(left).subtract(right).abs();
};

/**
 * Resample 8days, 4 days ImageCollections to daily according to Join.saveBest 
 * maxDifference
 *
 * @param {ImageCollection} dailyImg_iters   [description]
 * @param {ImageCollection} ImgCols          [description]
 * @param {integer}         days             maxDiff = days, dedault was 9days
 * @return {ImageCollection}       [description]
  */ 
var resampleToDaily = function(dailyImg_iters, ImgCols, days) {
    if (typeof days === 'undefined'){ days = 9; }
    var maxDiff   = ee.Filter.maxDifference({
        difference: days * millis_1d,
        leftField : 'system:time_start',
        rightField: 'system:time_start'
    });
  return SaveBest(dailyImg_iters, ImgCols, maxDiff)
      .select([1]); //select the second band, 'matches' maybe can't found
};

exports = {
    millis_1d      : millis_1d,
    maxDiff_9d     : maxDiff_9d,
    maxDiff_1y     : maxDiff_1y,
    filterTimeEq   : filterTimeEq,
    
    SaveBest       : SaveBest,
    InnerJoin      : InnerJoin,
    ImgColFun      : ImgColFun,
    Img_absdiff    : Img_absdiff,
    resampleToDaily: resampleToDaily
};