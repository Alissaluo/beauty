/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var MOD13Q1 = ee.ImageCollection("MODIS/006/MOD13Q1"),
    MOD13A1 = ee.ImageCollection("MODIS/MOD13A1"),
    NDVI_v4 = ee.ImageCollection("NOAA/CDR/AVHRR/NDVI/V4"),
    MCD15A3H = ee.ImageCollection("MODIS/006/MCD15A3H"),
    MOD11A2 = ee.ImageCollection("MODIS/006/MOD11A2"),
    MOD09GA_006 = ee.ImageCollection("MODIS/MOD09GA_006_NDVI"),
    points = ee.FeatureCollection("users/kongdd/shp/flux-212"),
    MOD17A2H = ee.ImageCollection("MODIS/006/MOD17A2H"),
    MOD16A2 = ee.ImageCollection("MODIS/NTSG/MOD16A2/105"),
    NLCD = ee.ImageCollection("USGS/NLCD"),
    MCD12Q1_005 = ee.ImageCollection("MODIS/051/MCD12Q1"),
    MCD12Q1_006 = ee.ImageCollection("projects/pml_evapotranspiration/PML_INPUTS/MODIS/MCD12Q1_006"),
    region = /* color: #0b4a8b */ee.Geometry({
      "type": "GeometryCollection",
      "geometries": [
        {
          "type": "Point",
          "coordinates": [
            88.83047103881836,
            26.40124925727984
          ]
        },
        {
          "type": "Polygon",
          "coordinates": [
            [
              [
                88.69194030761719,
                26.447828357773517
              ],
              [
                88.91441345214844,
                26.22506291302477
              ],
              [
                89.00436401367188,
                26.289105700811348
              ],
              [
                88.79562377929688,
                26.509904531413927
              ]
            ]
          ],
          "geodesic": true,
          "evenOdd": true
        }
      ],
      "coordinates": []
    }),
    imgcol_pmlv2 = ee.ImageCollection("projects/pml_evapotranspiration/PML/OUTPUT/PML_V2_8day"),
    imgcol_mod16a2 = ee.ImageCollection("MODIS/NTSG/MOD16A2/105");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/**
 * Visualization to check fluxsits' landcover
 * 
 * Updated 10 Jan, 2018
 * Dongdong Kong, Sun Yat-sen Univ
 */ 
 var pkg_vis    = require('users/kongdd/public:pkg_vis.js');
var points     = require('users/kongdd/public:data/flux_points.js').points;
var points_buf = points.map(function(f) { return f.buffer(500);});

MCD12Q1_005 = MCD12Q1_005.select(['Land_Cover_Type_1']); //IGBP type
var lc_colors_005 = ["#aec3d6", "#162103", "#235123", "#399b38", "#38eb38", "#39723b", 
    "#6a2424", "#c3a55f", "#b76124", "#d99125", "#92af1f", "#10104c", 
    "#cdb400", "#cc0202", "#332808", "#d7cdcc", "#f7e174", "#743411"];
var lc_names_005 = ['WATER', 'ENF', 'EBF', 'DNF', 'DBF', 'MF', 
    'CSH', 'OSH', 'WSA', 'SAV', 'GRA', 'WET', 
    'CRO', 'URB', 'CNV', 'SNOW', 'BSV', 'UNC'];

var lc_colors_006 = ["#743411", "#162103", "#235123", "#399b38", "#38eb38", "#39723b", 
    "#6a2424", "#c3a55f", "#b76124", "#d99125", "#92af1f", "#10104c", 
    "#cdb400", "#cc0202", "#332808", "#d7cdcc", "#f7e174", "#aec3d6"];
var lc_names_006 = ['UNC', 'ENF', 'EBF', 'DNF', 'DBF', 'MF', 
    'CSH', 'OSH', 'WSA', 'SAV', 'GRA', 'WET', 
    'CRO', 'URB', 'CNV', 'SNOW', 'BSV', 'WATER'];

/** visualization parameters for EVI */
var palette = ['#570088', '#920057', '#CE0027', '#FF0A00', '#FF4500', '#FF8000', '#FFB100', '#FFD200', '#FFF200', '#C7EE03', '#70D209', '#18B80E', '#067F54', '#033FA9', '#0000FF'];
var vis     = { min: 0.0, max: 50.0, palette: palette.reverse(), bands: 'ET'};
// visParams = ee.Dictionary(visParams).remove(['bands']);

var lg = ui.Panel({ 
  layout: ui.Panel.Layout.Flow('horizontal'),
  style: { 
      position: 'bottom-left', 
      padding: '8px 15px' 
  } });

var lg1 = pkg_vis.grad_legend(vis, 'ET (8-day mm)', false);
var lg2 = pkg_vis.discrete_legend(lc_names_005, lc_colors_005, 'MCD12Q1_005', false);
var lg3 = pkg_vis.discrete_legend(lc_names_006, lc_colors_006, 'MCD12Q1_006', false);

function basemap(map){
    map.addLayer(points, {color:"red"}, 'points');
    map.addLayer(points_buf, {}, 'points_buf');
    return map;
}

imgcol_pmlv2 = imgcol_pmlv2.select([0, 1, 2, 3, 4]).map(function(img){
    img = img.divide(100).multiply(8)
        .copyProperties(img, ['system:time_start']);
    img   = ee.Image(img);
    var ET = img.expression('b("Ec") + b("Es") + b("Ei")').rename("ET");
    return img.addBands(ET);
});
imgcol_mod16a2 = imgcol_mod16a2.map(function(img){
    return img.divide(10)
        .copyProperties(img, ['system:time_start']);
    
});

var mapNames = ["pmlv2", "mod16a2", "MCD12Q1_005", "MCD12Q1_006"]; //MOD13A1
var maps = []; 

MCD12Q1_005 = MCD12Q1_005.select(0);
var imgcols = [imgcol_pmlv2, imgcol_mod16a2, MCD12Q1_005, MCD12Q1_006];

// print(MCD12Q1_005);

var filterDate = ee.Filter.date("2005-01-01", "2012-12-31");

var chart = ui.Chart.image.series({
    imageCollection: imgcols[0], //['ETsim', 'Es', 'Eca', 'Ecr', 'Es_eq']
    region         : region,
    reducer        : ee.Reducer.mean(),
    scale          : 2000
});


chart.style().set({ position: 'bottom-right', width: '500px', height: '300px', 
    margin: '0 0 0px 0', padding: '0'});  
chart.onClick(function(xValue, yValue, seriesName) {
    if (!xValue) return; // Selection was cleared.
    var datestr   = (new Date(xValue)).toUTCString();
    chart.setOptions({title: datestr});
    // Show the image for the clicked date.
    // var equalDate = ee.Filter.equals('system:time_start', xValue);
    maps_update(xValue);
    // Show a label with the date on the map.
    // if (label !== undefined)
    //     label.setValue(ee.Date(xValue).format('yyyy-MM-dd').getInfo()); //.toUTCString(), E, 
});
    
// print(typeof chart, chart);

/** visualization */
maps = pkg_vis.layout(4);

init_maps();
maps_update();
maps[0].setCenter(88.83339, 26.40248, 12);

// 0 : label, 1 : imgcol
function init_maps(){
    mapNames.forEach(function(value, index) {
      var map = maps[index], img;
      // map.setOptions('SATELLITE');
      if (index === 0) map.add(lg1);
      // if (index === 0) map.add(ui.Panel([chart], null, {position: 'bottom-right', width: '500px', height: '300px'}));
      if (index === 2){
          map.add(lg2);
      }
      if (index === mapNames.length - 1) {
          map.add(lg3);
          map.add(chart);
      }
    });
    // return maps; // global variable
}

function maps_update(date){
    if (date === undefined){
        date = imgcols[0].aggregate_first('system:time_start');
    }
    date        = ee.Date(date);
    var datestr = date.format('yyyy-MM-dd').getInfo();
    var year    = date.get('year');
    
    var filter_year = ee.Filter.calendarRange(year, year, 'year');
    var filter_date = ee.Filter.date(date);
    maps.forEach(function(value, index) {
        var str = mapNames[index] + ', ' + datestr;
        
        maps[index].widgets().set(2, ui.Label(str));
       
        var imgcol = imgcols[index];
        
        var filter = index >= 2 ? filter_year : filter_date;
        var img = imgcol.filter(filter);
        
        var layer;
        if (index < 2){
            layer = ui.Map.Layer(img, vis, mapNames[index]);
        }
        
        if (index === 2) layer = ui.Map.Layer(img, {min: 0, max: 17, palette:lc_colors_005}, mapNames[index]);
        if (index === 3) layer = ui.Map.Layer(img, {min: 0, max: 17, palette:lc_colors_006}, mapNames[index]);
        
        maps[index].layers().set(0, layer);
    });
}
