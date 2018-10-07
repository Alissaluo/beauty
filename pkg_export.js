/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var pkg_export = {};
/***** End of imports. If edited, may not auto-convert in the playground. *****/
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
 * @param  {dict} options    other options for reduceRegions, e.g. crs, scale
 * @return {[type]}          [description]
 * 
 * @examples
 * var export_data = ImgCol.map(mh_BufferPoints(points, 250, reducer,
 * 250));
 */
pkg_export._Buffer = function(options) {
    var reducer = options.reducer;
    var list = typeof reducer === 'string' || reducer.getInfo().type !== 'Reducer.toCollection';
    
    // Only Reducer.toCollection is different, which has a features in property
    if (list){
        // ee.Reducer.toList() result contains geometry, need to remove it.
        // features' band properties have already could distinguish each other.
        return function(img){
            return img.reduceRegions(options)
                .map(function(f){ 
                    return ee.Feature(null).copyProperties(f)
                        .set('date', ee.Date(img.get('system:time_start')).format('yyyy-MM-dd'));
                });
        };
    }else{
        return function(img){
            var data = img.reduceRegions(options)
                .map(function(f){ return f.get('features'); })
                .flatten(); 
            // `ee.Reducer.toCollection` has no feature geometry, and cliped 
            // data are in FeatureCollection.
            return data;
        };
    }
};


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
pkg_export.clipImgCol = function(ImgCol, features, distance, reducer, file, options){
    var folder     = options.folder     || "";     // drive forder
    var fileFormat = options.fileFormat || "csv";  // 'csv' or 'geojson'
    var save =  (options.save === undefined) ? true : options.save;

    distance   = distance   || 0;
    reducer    = reducer    || "first";

    if (distance > 0) features = features.map(function(f) { return f.buffer(distance);});

    var image = ee.Image(ImgCol.first()).select(0);
    var prj   = image.projection(), 
        scale = prj.nominalScale();
    var options_reduce = { collection: features, reducer: reducer, crs: prj, scale: scale, tileScale: 16 };

    var export_data = ImgCol.map(pkg_export._Buffer(options_reduce), true).flatten();
    pkg_export.Export_Table(export_data, save, file, folder, fileFormat);
};


/**
 * [spClipImgCol description]
 *
 * @param  {ImageCollection}   imgcol     The ImageCollection to export.
 * @param  {FeatureCollection} points     The FeatureCollection to clip \code{imgcol}
 * @param  {Double} scale      scale only used to generate buffer distance. 
 * `reduceRegions` use image.projection().nominalScale() as scale.
 * @param  {String} name       [description]
 * @param  {ee.Reducer} reducers 2*1 reducer, the first one is for no buffer 
 * situation; the second is for buffer. If reduces length is 1, then default
 * reducer for buffer is 'toList' when \code{list} = true. 
 * If list = true, while reducer also is `toList`, error will be occured.
 * @param  {boolean} list       If list = false, any null value in feature will 
 * lead to the feature being ignored. If list = true, value in csv will be 
 * like that `[0.8]`.
 * 
 * @param  {[type]} buffer     [description]
 * @param  {[type]} folder     [description]
 * @param  {[type]} fileFormat [description]
 * @return {[type]}            [description]
 */
// Example:
// var options = {
//     reducers : ['first'],  // 1th: non-buffer; 2th: buffer; Only one means no buffer
//     buffer   : true,      // whether to use buffer
//     list     : false, 
//     folder   : '', // drive forder
//     fileFormat: 'csv'      // 'csv' or 'geojson'
// };
// pkg_export.spClipImgCol(imgcol, points, "imgcol_prefix", options)
pkg_export.spClipImgCol = function(ImgCol, Features, file_prefix, options){
    file_prefix = file_prefix || "";
    var reducers   = options.reducers  || ['toList']; // 1th: non-buffer; 2th: buffer
    var buffer     = options.buffer    || false;      // whether to use buffer
    var list       = options.list      || false;

    var image  = ee.Image(ImgCol.first()), 
        prj    = image.select(0).projection();
    // scale is used to decide buffer `dist` and filename
    var scale  = options.scale || prj.nominalScale().getInfo(); 
    
    var dists  = buffer ? [0, 1, 2] : [0];
    var file, dist, reducer, reducer_buffer,
        reducer_nobuffer = reducers[0];

    // reduce for buffer
    if (reducers.length > 1){
        reducer_buffer = reducers[1];
    } else {
        reducer_buffer  = list ? ee.Reducer.toList() : ee.Reducer.toCollection(ee.Image(ImgCol.first()).bandNames());             
    }
  
    ImgCol = ee.ImageCollection(ImgCol);
    for(var i = 0; i < dists.length; i++){
        dist = scale*dists[i];
        // If distance > 0, buffer will be applied to `features`
        reducer = dist > 0 ? reducer_buffer : reducer_nobuffer ;  
     
        file = file_prefix.concat('_').concat(Math.floor(dist)).concat('m_buffer');//fluxsites_
        pkg_export.clipImgCol(ImgCol, Features, dist, reducer, file, options); //geojson
    }  
};


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
pkg_export.Export_Table = function(export_data, save, file, folder, fileFormat) {
    save       = save       || false;
    folder     = folder     || "";
    fileFormat = fileFormat || "GeoJSON";

    // export params
    var params = {
        collection  : export_data, //.flatten(),
        description : file,
        folder      : folder,
        fileFormat  : fileFormat //GeoJSON, CSV
    };

    // If save, then export to drive, else print in the console
    if (save) {
        Export.table.toDrive(params);
    } else {
        print(file, export_data);
    }
};


pkg_export.clip = function(ImgCol, poly){
  return ImgCol.map(function(img){
      return img.clip(poly.geometry());
  });
};


/**
 * Get exported image dimensions
 *
 * @param {array.<number>}     range     [lon_min, lat_min, lon_max, lat_max]
 * @param {double} cellsize  cellsize (in the unit of degree), used to calculate 
 * dimension.
 * 
 * @return {String} WIDTHxHEIGHT
 */
pkg_export.getDimensions = function(range, cellsize){
    var step   = cellsize; // degrees
    var sizeX  = (range[2] - range[0]) / cellsize;
    var sizeY  = (range[3] - range[1]) / cellsize;
    sizeX = Math.round(sizeX);
    sizeY = Math.round(sizeY);

    var dimensions = sizeX.toString() + 'x' + sizeY.toString(); //[sizeX, ]
    return dimensions;
};


/** Get projection info of ee.Image or ee.ImageCollection */
pkg_export.getProj = function(img){
    img = ee.ImageCollection(img).first();
    var prj = img.select(0).projection();
    var prj_dict = prj.getInfo();
    
    return {
        prj:prj, 
        scale:prj.nominalScale(),
        crs:prj_dict.crs,
        crsTransform: prj_dict.transform
    };
};


/**
 * ExportImage_deg
 *
 * @param {ee.Image} Image     The image to export.
 * @param {String} task      The file name of exported image
 * @param {array.<number>}     range     [lon_min, lat_min, lon_max, lat_max]
 * @param {double} cellsize  cellsize (in the unit of degree), used to calculate 
 * dimension.
 * @param {String} type      export type, i.e. 'asset', 'cloud' and 'drive'
 * @param {String} folder    The Folder that the export will reside in. If 
 * export type is cloud or asset, folder need to be absolute path.
 * @param {String} crs       CRS to use for the exported image.
 * @param {String} crsTransform  Affine transform to use for the exported image. 
 * Requires "crs" to be defined.
 * 
 * @example
 * ExportImg_deg(Image, task, range, cellsize, type, folder, crs, crs_trans)
 */
pkg_export.ExportImg_deg = function(Image, task, range, cellsize, type, folder, crs, crsTransform){
    var bounds; // define export region

    range  = range  || [-180, -60, 180, 90];
    type   = type   || 'drive';
    folder = folder || "";
    crs    = crs    || 'SR-ORG:6974';

    if (typeof crsTransform === 'undefined'){
        bounds = ee.Geometry.Rectangle(range, 'EPSG:4326', false); //[xmin, ymin, xmax, ymax]
    }

    // var crsTransform  = [cellsize, 0, -180, 0, -cellsize, 90]; //left-top
    var params = {
        image        : Image,
        description  : task,
        crs          : crs,
        crsTransform : crsTransform,
        region       : bounds,
        dimensions   : getDimensions(range, cellsize),
        maxPixels    : 1e13
    };

    switch(type){
        case 'asset':
            params.assetId = folder.concat('/').concat(task), //projects/pml_evapotranspiration/;
            Export.image.toAsset(params);  
            break;
    
        case 'cloud':
            params.bucket         = "kongdd";
            params.fileNamePrefix = folder.concat('/').concat(task);
            params.skipEmptyTiles = true;
            Export.image.toCloudStorage(params);
            break;
        
        case 'drive':
            params.folder         = folder;
            params.skipEmptyTiles = true;
            Export.image.toDrive(params);  
            break;
    }
    // print(params);
};

/**
 * Batch export GEE ImageCollection
 *
 * @param {ee.ImageCollection} ImgCol    The ImageCollection to export.
 * @param {array.<string>}     dateList  Corresponding date string list of ImgCol
 * @param {array.<number>}     range     [lon_min, lat_min, lon_max, lat_max]
 * @param {double} cellsize  cellsize (in the unit of degree), used to calculate 
 * dimension.
 * @param {String} type      export type, i.e. 'asset', 'cloud' and 'drive'
 * @param {String} folder    The Folder that the export will reside in. If 
 * export type is cloud or asset, folder need to be absolute path.
 * @param {String} crs       CRS to use for the exported image.
 * @param {String} crsTransform  Affine transform to use for the exported image. 
 * Requires "crs" to be defined.
 * @param {[type]} prefix    The prefix of the exported file name.
 */
pkg_export.ExportImgCol = function(ImgCol, dateList, range, cellsize, type, 
    folder, crs, crsTransform, prefix)
{    
    /** 
     * If dateList was undefined, this function is low efficient.
     * ee.ImageCollection.toList() is quite slow, often lead to time out.
     */
    dateList = dateList || ee.List(ImgCol.aggregate_array('system:time_start'))
        .map(function(date){ return ee.Date(date).format('yyyy-MM-dd'); }).getInfo();

    type   = type   || 'drive';
    crs    = crs    || 'SR-ORG:6974';
    prefix = prefix || '';

    var n = dateList.length;
    
    for (var i = 0; i < n; i++) {
        // var img  = ee.Image(colList.get(i));
        var date = dateList[i];
        var img  = ee.Image(ImgCol.filterDate(date).first()); 
        // var task = img.get('system:id');//.getInfo();
        var task = prefix + date;
        print(task);
        pkg_export.ExportImg_deg(img, task, range, cellsize, type, folder, crs, crsTransform); 
    }
};

pkg_export.export_shp = function(features, file, folder, fileFormat){
    folder     = folder || "";
    fileFormat = fileFormat || 'shp';
    
    features = features.map(function(f) { return f.set('index', f.get('system:index')); } );
    Export.table.toDrive({
        collection:features, 
        description:file, 
        folder:folder, 
        // fileNamePrefix, 
        fileFormat:'shp'
        // , selectors
    });
};


pkg_export.range_global = [-180, -60, 180, 90]; // [long_min, lat_min, long_max, lat_max]
pkg_export.range_TP     = [73, 25, 105, 40];    // Tibetan Plateau

exports = pkg_export;
// print('pkg_export', pkg_export)
