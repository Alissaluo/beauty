// var pkg_export = require('users/kongdd/public:pkg_export.js');

/**
 * Clip image data of points buffer
 * 
 * map function handle for BufferPoints, return a function of img 
 * 
 * @param  {[type]} points   [description]
 * @param  {[type]} distance [description]
 * @param  {[type]} reducer  [description]
 * @param  {[type]} scale    [description]
 * @param  {[type]} list     [description]
 * @return {[type]}          [description]
 * 
 * @example:
 * var export_data = ImgCol.map(mh_BufferPoints(points, 250, reducer, 250));
 */
// ImgCol system:index need to be fixed
function mh_BufferPoints(points_buf, reducer, scale, list) {
    // var index  = img.get('system:index');
    if (list){
        // If don't use buffer, the original reducer works.
        // And remove points geometry information
        return function(img){
            return img.reduceRegions({ 
                collection: points_buf, scale: scale, reducer: reducer, tileScale: 16 
            })
            .map(function(f){ 
                return ee.Feature(null).copyProperties(f)
                    .set('date', ee.Date(img.get('system:time_start')).format('yyyy-MM-dd'));
            });
        };
    }else{
        return function(img){
            var data = img.reduceRegions({ 
                collection: points_buf, scale: scale, reducer: reducer, tileScale: 16
            }).map(function(f){ return f.get('features'); }).flatten(); //cliped data are in featureCollections
            // 1. have converted list into featurecollections
            // 2. just for PML modis and gldas combine output
            
            // data = ee.Algorithms.If(list, data, data.map(function(f){ return f.get('features'); }));
            // data = ee.Feature(ee.FeatureCollection(data).flatten());//reducer return collection for every feature
            return data;
        };
    }
}

function BufferPoints(ImgCol, points, distance, reducer, scale, list, save, file, folder){
    if (typeof distance === 'undefined') distance = 0;   
    if (typeof list     === 'undefined') list = false;
    if (typeof scale    === 'undefined') scale = 500;
    
    // ee.Reducer.toList(), ee.Reducer.mean(), ee.Reducer.first()
    var points_buf;
    if (distance > 0){
        reducer = list ? ee.Reducer.toList() : ee.Reducer.toCollection(ee.Image(ImgCol.first()).bandNames()); 
        points_buf = points.map(function(f) { return f.buffer(distance);});
    }else {
        if(typeof reducer  === 'undefined') reducer = ee.Reducer.first();//mean();
        points_buf = points;
    }
    
    var export_data = ImgCol.map(mh_BufferPoints(points_buf, reducer, scale, list), true).flatten();
    Export_Table(export_data, save, file, folder);
}

function spClipImgCol(ImgCol, points, scale, name){
    var dists = [0, 1, 2]; //, 1000 
    ImgCol = ee.ImageCollection(ImgCol);
    var dist;
    for(var i = 0; i < dists.length; i++){
        dist = dists[i]*scale;
        file = 'fluxsites_'.concat(name).concat('_').concat(dist).concat('m_buffer');
        BufferPoints(ImgCol, points, dist, reducer, scale, list, save, file, folder);
    }  
}

/**
 * Clip ImageCollection data by points through reduceRegions, and points 
 * was global variable.
 *
 * @param  {ee.Image} Img Image to export data
 * @return {FeatureCollection}     [description]
 */
function fetchTable_v1(img) {
    var id = Img.get('system:id');
    var featureCol = img.reduceRegions({ collection: points, reducer: ee.Reducer.first(), scale: 500, tileScale: 16 })
        .map(function(feature) {
            return ee.Feature(null).copyProperties(feature)
                .set('system:id', id);
        });
    return ee.FeatureCollection(featureCol);
}

/**
 * Clip ImageCollection data by points through reduceRegion. 
 */
function fetchTable_v2(img) {
    var id = img.get('system:index'); // or index
    var featureCol = points.map(function(feature) {
        feature = ee.Feature(feature);
        var data = Img.reduceRegion(ee.Reducer.first(), feature.geometry(), 500);
        return ee.Feature(null, data)
            .set('system:id', id)
            .set('site', feature.get('site'));
    });
    return ee.FeatureCollection(featureCol);
}

/**
 * Export_table
 *
 * @param  {ImageCollection}   ImgCol the ImageCollection data you want to
 * export.
 * @param  {FeatureCollection} points points used to clip ImgCol
 * @param  {boolean}           save   whether save or not
 * @param  {String}            file   filename
 * @return {FeatureCollection} If save = false, will return FeatureCollection.
 * Otherwise, none will be return. 
 */
function Export_Table(export_data, save, file, folder) {
    if (typeof save   === 'undefined') save   = false;
    if (typeof folder === 'undefined') folder = "";
    
    // If save, then export to drive, else print in the console
    if (save) {
        Export.table.toDrive({
            collection : export_data, //.flatten(),
            description: file,
            folder     : folder,
            fileFormat : 'GeoJSON' //GeoJSON, CSV
        });
    } else {
        print(file, export_data);
    }
}

function clip(ImgCol, poly){
  return ImgCol.map(function(img){
      return img.clip(poly.geometry());
  });
}

/**
 * ExportImage_deg
 *
 * @param {[type]} Image [description]
 * @param {[type]} range [lon_min, lat_min, lon_max, lat_max], e.g. [70, 15, 120, 40]
 * @param {[type]} task  [description]
 * @param {[type]} scale [description]
 */
function ExportImg_deg(Image, range, task, scale, drive, folder, crs){
  // Image = Image.select(['slope', 'tval']);
  // define export region
  if (typeof range  === 'undefined') {range = [-180, -70, 180, 90];}
  if (typeof drive  === 'undefined') {drive = false;}
  if (typeof folder === 'undefined') {
    folder = drive ? 'PML test' : 'PML_8km_daily_LU_dynamic';
  }
  if (typeof crs === 'undefined') { crs = 'SR-ORG:6974';} //'EPSG:4326'
   
  var bounds = ee.Geometry.Rectangle(range, 'EPSG:4326', false); //[xmin, ymin, xmax, ymax]
  
  var step   = scale; // degrees
  var sizeX  = (range[2] - range[0]) / step;
  var sizeY  = (range[3] - range[1]) / step;
  var dimensions = sizeX.toString() + 'x' + sizeY.toString(); //[sizeX, ]

  if (drive){
       Export.image.toDrive({
          image: Image,
          description: task,
          folder: folder,
          crs: crs,
          region: bounds,
          dimensions: dimensions,
          maxPixels: 1e13,
          skipEmptyTiles: true
      });  
  }else{
      Export.image.toAsset({
          image: Image,
          description: task,
          assetId: folder.concat('/').concat(task), //projects/pml_evapotranspiration/
          crs: crs,
          region: bounds,
          dimensions: dimensions,
          maxPixels: 1e13
      });  
  }
}



/**
 * ExportImgCol
 *
 * Fast export ImgCol to drive
 * 
 * @param {ImageCollection} ImgCol      The ImageCollection you want to export.
 * @param {ee.List}         daily_iters A date List object store the corresponding date of ImgCol.
 *                                      ImageCollection also can be accept.              
 * @param {List}            range       [lon_min, lat_min, lon_max, lat_max], e.g. [70, 15, 120, 40]
 * @param {float}           scale       cellsize in degree
 */
function ExportImgCol(ImgCol, daily_iters, range, scale, drive, folder, crs){
    // print(ImgCol, 'inside');
    // ImgCol = ee.ImageCollection(ImgCol); //confirm variable type
    if (typeof daily_iters === 'undefined'){
        // If daily_iters was undefined, this function is low efficient.
        // toList is quite slow, often lead to time out
        daily_iters = ImgCol.toList(ImgCol.size())
            .map(function(img){
                return ee.Date(ee.Image(img).get('system:time_start'));
            });
        // print('here', daily_iters);
    }
    if (typeof drive === 'undefined') { drive = false;}
    if (typeof crs   === 'undefined') { crs = 'SR-ORG:6974';} //'EPSG:4326'

    var dates = daily_iters.map(function(date){
        return ee.Date(date).format('yyyy-MM-dd');
    }).getInfo();
    var n = dates.length; //JavaScript client object, print(n, typeof n);
    
    for (var i = 0; i < n; i++) {
        // var img  = ee.Image(colList.get(i));
        var date = dates[i];
        var img  = ee.Image(ImgCol.filterDate(date).first()); 
        // var task = img.get('system:id');//.getInfo();
        var task = date;
        print(task);
        //drive = false, will export to asset
        ExportImg_deg(img, range, task, scale, drive, folder, crs); 
    }
}

function ExportImgCol_lst(ImgCol, range, scale){
  var n = ImgCol.size().getInfo();
  var colList = ImgCol.toList(n);
  // print(n, typeof n);
  for (var i = 0; i < n; i++) {
      var img  = ee.Image(colList.get(i));
      var task = img.get('system:id').getInfo();
      //drive = true, save into drive
      ExportImg_deg(img, range, task, scale, true); 
  }
}

exports = {
  mh_BufferPoints  :mh_BufferPoints,    // for img
  BufferPoints     :BufferPoints,       // for ImgCol
  fetchTable_v1    :fetchTable_v1,
  fetchTable_v2    :fetchTable_v2,
  ExportImg_deg    :ExportImg_deg,
  Export_Table     :Export_Table,
  clip             :clip,
  ExportImgCol     :ExportImgCol,
  ExportImgCol_lst :ExportImgCol_lst,

  global_range     :[-180, -60, 180, 85], //[long_min, lat_min, long_max, lat_max]
  TP_range         :[73, 25, 105, 40],
};
