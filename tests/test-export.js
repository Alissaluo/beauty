/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var imgcol = ee.ImageCollection("MODIS/006/MCD15A3H");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Download ImageCollection
var pkg_export = require('users/kongdd/public:pkg_export.js');


imgcol = imgcol.select('Lai');

// var prj = pkg_export.getProj(imgcol_gpp_mod);
var range     = [-180, -60, 180, 90],
    bounds    = ee.Geometry.Rectangle(range, 'EPSG:4326', false), //[xmin, ymin, xmax, ymax]
    cellsize  = 1/240,   // in degree
    type      = 'asset', // 'drive', 'asset' or `cloud`
    folder    = 'projects/pml_evapotranspiration/PML/OUTPUT/TREND',
    crs       = 'SR-ORG:6974'; // EPSG:4326, SR-ORG:6974, projects/pml_evapotranspiration
    // crsTransform = prj.crsTransform;

var img = imgcol.first();

pkg_export.ExportImg(img      , 'img_LAI', range, cellsize, type, folder, crs);
folder    = 'projects/pml_evapotranspiration/PML/OUTPUT/TREND/landcover_perc_G025';
pkg_export.ExportImgCol(imgcol.limit(3), undefined, range, cellsize, type, folder, crs); //, crsTransform
