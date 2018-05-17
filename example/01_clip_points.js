/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var MOD13Q1 = ee.ImageCollection("MODIS/006/MOD13Q1"),
    MOD13A1 = ee.ImageCollection("MODIS/MOD13A1"),
    NDVI_v4 = ee.ImageCollection("NOAA/CDR/AVHRR/NDVI/V4"),
    MCD15A3H = ee.ImageCollection("MODIS/006/MCD15A3H"),
    MOD09GA_006 = ee.ImageCollection("MODIS/MOD09GA_006_NDVI"),
    MOD17A2H = ee.ImageCollection("MODIS/006/MOD17A2H"),
    points = ee.FeatureCollection("users/kongdd/shp/flux-212");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/** clip points buffering data */
var pkg_export = require('users/kongdd/public:pkg_export.js');
var points = require('users/kongdd/public:data/flux_points.js').points;
// print(points);
// points = points.filter(ee.Filter.inList('site', ['DE-SfN', 'CH-Fru'])); 

// 'first' Reducer sometime lead to variables all null and no result return
var reducer     = ee.Reducer.first();
reducer         = ee.Reducer.toList(); 

// 1. MOD13Q1. distance = 0, means no buffer
var dists = [0, 250, 500]; //, 1000 
var ImgCol, scale, file;
var folder = "",
    save   = true,
    i = 0,
    list = true;
scale = 1000;

file = 'fluxsites_NDVIv4_'.concat(dists[i]).concat('m_buffer');
ImgCol = NDVI_v4.filterDate("1994-01-01", "2017-12-23");
// pkg_export.BufferPoints(ImgCol, points, dists[i], reducer, scale, list, save, file, folder);

// 1. MOD13Q1
spClipImgCol(MOD13Q1, points, 250, 'MOD13Q1');
// 2.MOD13A1
spClipImgCol(MOD13A1, points, 500, 'MOD13A1');
// // 3. LAI MCD15A3H
// spClipImgCol(MCD15A3H, points, 500, 'MCD15A3H_LAI');

// 4. night land surface temperature
// spClipImgCol(MOD11A2, points, 1000, 'MOD11A2_Tnight');
// 5. daily NDVI, check the spatial resolution, 500m
// spClipImgCol(MOD09GA_006, points, 500, 'MOD09GA_006_NDVI');

// 6. MODIS ET
// spClipImgCol(MOD16A2, points, 500, 'MOD16A2_ET');
// 7. MODIS GPP
spClipImgCol(MOD17A2H, points, 500, 'MOD17A2H_GPP');
// 8. MODIS LANDCOVER
// spClipImgCol(MCD12Q1, points, 500, 'MCD12Q1_lc');
// spClipImgCol(NLCD   , points, 30 , 'NLCD');
// spClipImgCol(MCD12Q2, points, 500, 'MCD12Q2');
// spClipImgCol(MCD12Q1_006, points, 500, 'MCD12Q1006_lc');

function spClipImgCol(ImgCol, points, scale, name){
    var dists = [0, 1, 2]; //, 1000 
    ImgCol = ee.ImageCollection(ImgCol);
    var dist;
    for(var i = 0; i < dists.length; i++){
        dist = dists[i]*scale;
        file = 'fluxsites_'.concat(name).concat('_').concat(dist).concat('m_buffer');
        pkg_export.BufferPoints(ImgCol, points, dist, reducer, scale, list, save, file, folder);
    }  
}