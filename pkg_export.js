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
 * @examples
 * var export_data = ImgCol.map(mh_BufferPoints(points, 250, reducer,
 * 250));
 */
function mh_Buffer(features, reducer, scale, list) {
    if (list){
        // ee.Reducer.toList() result contains geometry, need to remove it.
        // features' band properties have already could distinguish each other.
        return function(img){
            return img.reduceRegions({ 
                collection: features, scale: scale, reducer: reducer, tileScale: 16 
            })
            .map(function(f){ 
                return ee.Feature(null).copyProperties(f)
                    .set('date', ee.Date(img.get('system:time_start')).format('yyyy-MM-dd'));
            });
        };
    }else{
        return function(img){
            var data = img.reduceRegions({ 
                collection: features, scale: scale, reducer: reducer, tileScale: 16
            })
            .map(function(f){ return f.get('features'); }).flatten(); 
            // `ee.Reducer.toCollection` has no feature geometry, and cliped 
            // data are in FeatureCollection.
            return data;
        };
    }
}

/**
 * Clip ImageCollection by points or polygons
 *
 * @param  {ee.ImageCollection}   ImgCol   The ImageCollection you want to clip
 * @param  {ee.FeatureCollection} features The FeatureCollection used to clip
 * `ImgCol`, can be point or polygon FeatureCollection.
 * @param  {Integer} distance If `distance` > 0, a buffer with the ridius of
 * `distance` will be applied to `features`.
 * @param  {ee.Reducer} reducer e.g. ee.Reducer.toList(), ee.Reducer.mean(), ee.Reducer.first(), ...
 * @param  {Integer} scale    [description]
 * @param  {Boolean} list     [description]
 * @param  {Boolean} save     [description]
 * @param  {String}  file     [description]
 * @param  {Boolean} folder   [description]
 * @return {NULL}          [description]
 */
function clipImgCol(ImgCol, features, distance, reducer, scale, list, save, file, folder, fileFormat){
    if (typeof distance   === 'undefined') distance = 0;   
    if (typeof list       === 'undefined') list     = false;
    if (typeof scale      === 'undefined') scale    = 500;
    if (typeof fileFormat === 'undefined') fileFormat = "GeoJSON";

    // If distance > 0, buffer will be applied to `features`
    if (distance > 0){
        reducer  = list ? ee.Reducer.toList() : ee.Reducer.toCollection(ee.Image(ImgCol.first()).bandNames()); 
        features = features.map(function(f) { return f.buffer(distance);});
    }else {
        if(typeof reducer  === 'undefined') reducer = ee.Reducer.first();//mean();
    }
    
    var export_data = ImgCol.map(mh_Buffer(features, reducer, scale, list), true).flatten();
    Export_Table(export_data, save, file, folder, fileFormat);
}

function spClipImgCol(ImgCol, points, scale, name, fileFormat){
    var dists = [0, 1, 2]; //, 1000 
    ImgCol = ee.ImageCollection(ImgCol);
    var dist;
    for(var i = 0; i < dists.length; i++){
        dist = dists[i]*scale;
        file = 'fluxsites_'.concat(name).concat('_').concat(dist).concat('m_buffer');
        BufferPoints(ImgCol, points, dist, reducer, scale, list, save, file, folder, fileFormat);
    }  
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
function Export_Table(export_data, save, file, folder, fileFormat) {
    if (typeof save       === 'undefined') save       = false;
    if (typeof folder     === 'undefined') folder     = "";
    if (typeof fileFormat === 'undefined') fileFormat = "GeoJSON";
    
    // export params
    var params = {
        collection  : export_data, //.flatten(),
        description : file,
        folder      : folder,
        fileFormat  : fileFormat //GeoJSON, CSV
    }

    // If save, then export to drive, else print in the console
    if (save) {
        Export.table.toDrive(params);
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
 * @param {ee.Image} Image     [description]
 * @param {[type]} range     [lon_min, lat_min, lon_max, lat_max], e.g. [70, 15,
 * 120, 40]
 * @param {[type]} task      [description]
 * @param {[type]} scale     [description]
 * @param {[type]} drive     [description]
 * @param {[type]} folder    [description]
 * @param {[type]} crs       [description]
 * @param {[type]} crs_trans [description]
 * 
 * @example
 * ExportImg_deg(Image, range, task, scale, drive, folder, crs, crs_trans)
 */
function ExportImg_deg(Image, range, task, scale, drive, folder, crs, crs_trans){
    var bounds; // define export region

    if (typeof range  === 'undefined') { range  = [-180, -70, 180, 90];}
    if (typeof drive  === 'undefined') { drive  = false;}
    if (typeof folder === 'undefined') { folder = ''; }
    if (typeof crs    === 'undefined') { crs    = 'SR-ORG:6974';} //'EPSG:4326'
    if (typeof crs_trans === 'undefined'){
        bounds = ee.Geometry.Rectangle(range, 'EPSG:4326', false); //[xmin, ymin, xmax, ymax]
    }

    var step   = scale; // degrees
    var sizeX  = (range[2] - range[0]) / step;
    var sizeY  = (range[3] - range[1]) / step;
    var dimensions = sizeX.toString() + 'x' + sizeY.toString(); //[sizeX, ]

    // var crs_trans  = [scale, 0, -180, 0, -scale, 90];
    var params = {
        image        : Image,
        description  : task,
        crs          : crs,
        crsTransform : crs_trans,
        region       : bounds,
        dimensions   : dimensions,
        maxPixels    : 1e13
    };
           
    if (drive){
        params.folder         = folder;
        params.skipEmptyTiles = true;
        Export.image.toDrive(params);  
    }else{
        params.assetId = folder.concat('/').concat(task), //projects/pml_evapotranspiration/;
        Export.image.toAsset(params);  
    }
    // print(params);
}

/**
 * ExportImgCol
 *
 * Fast export ImgCol to drive
 *
 * @param {ImageCollection} ImgCol      The ImageCollection you want to export.
 * @param {ee.List}         dateList    A date List object store the
 * corresponding date of ImgCol. ImageCollection also can be accept.
 *
 * @param {List}            range       [lon_min, lat_min, lon_max, lat_max],
 * e.g. [70, 15, 120, 40]
 *
 * @param {float}           scale       cellsize in degree 
 */
function ExportImgCol(ImgCol, dateList, range, scale, drive, folder, crs){
    if (typeof dateList === 'undefined'){
        /** 
         * If dateList was undefined, this function is low efficient.
         * ee.ImageCollection.toList() is quite slow, often lead to time out.
         */
        dateList = ee.List(ImgCol.aggregate_array('system:time_start'))
            .map(function(date){ return ee.Date(date).format('yyyy-MM-dd'); }).getInfo();
    }
    if (typeof drive === 'undefined') { drive = false;}
    if (typeof crs   === 'undefined') { crs = 'SR-ORG:6974';} //'EPSG:4326'

    var n = dateList.length;
    
    for (var i = 0; i < n; i++) {
        // var img  = ee.Image(colList.get(i));
        var date = dateList[i];
        var img  = ee.Image(ImgCol.filterDate(date).first()); 
        // var task = img.get('system:id');//.getInfo();
        var task = date;
        print(task);
        ExportImg_deg(img, range, task, scale, drive, folder, crs); 
    }
}

exports = {
  mh_Buffer        :mh_Buffer,    // for img
  clipImgCol       :clipImgCol,       // for ImgCol
  ExportImg_deg    :ExportImg_deg,
  Export_Table     :Export_Table,
  clip             :clip,
  ExportImgCol     :ExportImgCol,

  global_range     :[-180, -60, 180, 90], //[long_min, lat_min, long_max, lat_max]
  TP_range         :[73, 25, 105, 40],
};
