// var pkg_LAI   = require('users/kongdd/public:data/ImgCol_MODIS_LAI.js');
var pkg_join   = require('users/kongdd/public:pkg_join.js');

var global_prop = ['system:id', 'system:time_start', 'system:time_end']; //, 'system:index'
var addYearProp = function(img) {
  return img.set('year', ee.Date(img.get('system:time_start')).get('year'));
};

// ================================ LANDCOVER ==================================
// yearly MODIS landcover data, used to set parameters depended on landcovers, 
//  i.e. gsx, hc, LAIref, S__sls
var land_raw   = ee.ImageCollection('MODIS/051/MCD12Q1')
    .select('Land_Cover_Type_1');

// remove water, snow and ice, and unclassified land cover using updateMask
var masks = land_raw.map(function(land) {
    var img = ee.Image(land.expression('b() != 0 && b() != 15 && b() != 17'));
    return img.copyProperties(land, global_prop);
}).map(addYearProp);

// ================================ MODIS LAI ==================================
var LAI_4d_raw = ee.ImageCollection('MODIS/006/MCD15A3H')
    .select('Lai').map(addYearProp);
// var imgcol = LAI_4d_raw.limit(12);
// var imgcol_mov = movmean_lst(imgcol, 3);
// // print(imgcol);
// print(imgcol, imgcol_mov);
// Map.addLayer(imgcol, {}, 'raw');
// Map.addLayer(imgcol_mov, {}, 'mov mean');


/** 1. LAI replace missing value as -0.1, and update mask */
var LAI_4d_mask = LAI_4d_raw.map(function(img){
    return img.unmask(-0.1)
        .copyProperties(img, global_prop); //NA values are set as -0.1
});
// var LAI_4d_mask = pkg_join.SaveBest(LAI_4d_raw, masks, pkg_join.maxDiff_1y)
// // .aside(print)
//     .map(function(img) {
//         var mask   = img.select([1]);
//         var newImg = img.select([0]).multiply(0.1);
//         return newImg //.rename('LAI')).select(['LAI']);
//             .unmask(-0.1)
//             //.updateMask(mask)
//             .copyProperties(img, global_prop); //NA values are set as -0.1
//     });
// Map.addLayer(LAI_4d_mask.count());

exports = {
    land_raw   : land_raw,
    masks      : masks,
    LAI_4d_raw :LAI_4d_raw,
    LAI_4d_mask:LAI_4d_mask
};