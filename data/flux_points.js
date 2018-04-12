/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var points = ee.FeatureCollection("users/kongdd/shp/flux-212");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// var pkg_export = require('users/kongdd/public:data/flux_points.js');
points     = points.select(['site']); // reduce the export data size, only one band left

/** 1. Change points system:index, has to convert to list first. */
points = points.toList(points.size()).map(function(f){
    f = ee.Feature(f);
    return f.set('system:index', f.get('site'));
});
points = ee.FeatureCollection(points);

/**
 * Select the first `len` elements, and remove Id_del points
 * add `remove` property and update `system:index` (just suit for `flux-212` here).
 *
 * @param  {[type]} points [description]
 * @param  {[type]} len    [description]
 * @param  {[type]} Id_del [description]
 * @return {[type]}        [description]
 */
function pointsRemove_fun(points, len, Id_del) {
    var pnts_lst = points.toList(points.size());
    var FeaCol = ee.List.sequence(0, len - 1).map(function(i) {
        i = ee.Number(i).toInt(); //in order to get an int string
        var feature = ee.Feature(pnts_lst.get(i));
        var remove  = ee.Algorithms.If(Id_del.contains(i), true, false);

        return feature.set('remove', remove)
            .set('system:index', ee.String(i).cat("_").cat(feature.get('site')));
    });

    FeaCol = ee.FeatureCollection(FeaCol).filter(ee.Filter.eq("remove", false));
    return FeaCol;
}

// var Id_del = ee.List([]); //5
// points = pointsRemove(points, 212, Id_del).select(['site']); //212

exports = {
    points: points,
    pointsRemove_fun: pointsRemove_fun
};
