// var pkg_mov   = require('users/kongdd/public:pkg_movmean.js');
/**
 * moving average
 * @param  {ImageINPUTS_raw}  Imgs 
 * @param  {Number         }  frame : windows size, frame = 2 * half_win + 1
 * @return {ImageCollection} 
 */
// function movmean_lst(ImgCol, frame) {
//     frame = ee.Number(frame);
//     var win = frame.subtract(1).divide(2).toInt();
//     var n = ImgCol.size();
//     var y = ImgCol.toList(n);
//     // var frame     = ee.Number(win).multiply(2).add(1);

//     var firstVals = y.slice(1, win.add(1)).reverse();
//     var lastVals  = y.slice(1, win.add(1)).reverse();
//     var y_ext = firstVals.cat(y).cat(lastVals);

//     var movmean_ImgCol = ee.List.sequence(0, n.subtract(1)).map(function(i) {
//         var newImgs = y_ext.slice(i, ee.Number(i).add(frame));
//         // return ee.Image(y.get(i))
//         //     .addBands(ee.ImageCollection(newImgs).mean().rename('movmean'));
//         return ee.ImageCollection(newImgs).mean()
//             .copyProperties(y.get(i), ['system:time_start', 'system:time_end', 'system:id']); //.rename('movmean');
//     });
//     // print('ans', ans);
//     return ee.ImageCollection(movmean_ImgCol);
// }
var prop_global = ['system:time_start', 'system:time_end', 'system:id'];
/**
 * movmean_lst
 *
 * @param  {ImageCollection} ImgCol   The input time-series
 * @param  {Integer}         n        ImageCollection size, with the paramter can
 *                                    speed up ImgCol toList conversion.
 * @param  {Integer}         win_back [description]
 * @param  {Integer}         win_forw [description]
 * @return {[type]}          [description]
 */
function movmean_lst(ImgCol, n, win_back, win_forw) {
    if (typeof win_back === 'undefined') { win_back = 0; }
    if (typeof win_forw === 'undefined') { win_forw = 0; }

    win_back = ee.Number(win_back);
    win_forw = ee.Number(win_forw);

    // print(win_back, win_forw, n);
    // var n = ImgCol.size();
    var y = ImgCol.toList(n);
    // print(y);
    // print(win_back, win_forw, n);

    // 1. i: [0, win_back - 1], I = [0, i+win_forw]
    var headval = ee.List.sequence(0, win_back.subtract(1)) //index begin at 0
        // .aside(print, 'head')
        .map(function(i) {
            i = ee.Number(i);
            var I_beg = 0;
            var I_end = i.add(win_forw).add(1).min(n); //end exclusive, so add 1
            return ee.ImageCollection(y.slice(I_beg, I_end)).mean()
                .copyProperties(y.get(i), prop_global);
        });
    // 2. i: [(n - win_forw), n - 1], I = [i - win_forw, n]
    var tailval = ee.List.sequence(n.subtract(win_forw), n.subtract(1))
        // .aside(print,'tail')
        .map(function(i) {
            i = ee.Number(i);
            var I_beg = i.subtract(win_back).max(0);
            var I_end = n;
            return ee.ImageCollection(y.slice(I_beg, I_end)).mean()
                .copyProperties(y.get(i), prop_global);
        });
    // 3. i: [win_back, n - win_forw - 1], I = [i - win_back, i + win_forw]
    var midval = ee.List.sequence(win_back, n.subtract(win_forw).subtract(1))
        // .aside(print, 'mid')
        .map(function(i) {
            i = ee.Number(i);
            var I_beg = i.subtract(win_back);
            var I_end = i.add(win_forw).add(1);
            return ee.ImageCollection(y.slice(I_beg, I_end)).mean()
                .copyProperties(y.get(i), prop_global);
        });

    var ymov = headval.cat(midval).cat(tailval);
    // print('ans', ans);
    return ee.ImageCollection(ymov);
}

function movmean_Img(ImgCol, frame) {
    // movmean_Img average filter for MODIS 16day images
    // ImgCols: colection to smooth - must be single band
    // dt: smooth window im MODIS 16day pedriods. Time that will be added forward and back
    // dt = 1 will give a [t-1, t, t+1] window
    // uses a join on the date
    // 
    // less than and greater than 
    frame = ee.Number(frame);
    var win = frame.subtract(1).divide(2).toInt();

    var millis_1d = 86400000; // 24*3600*1000, ms
    var maxDiff = ee.Filter.maxDifference({
        difference: win.multiply(millis_1d),
        leftField: 'system:time_start',
        rightField: 'system:time_start'
    });

    ImgCol = ee.ImageCollection(ImgCol);

    var joinResult = ee.Join.saveAll('matches').apply(ImgCol, ImgCol, maxDiff);
    // print('joinResult', joinResult);

    var movmean_ImgCol = joinResult.map(function(img) {
        var matchImgCol = ee.ImageCollection.fromImages(img.get('matches'));
        var imageMean = matchImgCol.mean(); //matchImgCol.reduce(ee.Reducer.mean());
        // return ee.Image(ImageMatches).addBands(imageMean);
        return imageMean;
    });
    // print('movmean_ImgCol', movmean_ImgCol);
    return movmean_ImgCol;
}

exports = {
    movmean_lst: movmean_lst,
    movmean_Img: movmean_Img
};

/////////////////////////////////////////////////////////////////////////
/* Test for movmean functions*/
// debug();
function debug(){
    // test movmean_lst function through LAI ImgCol
    // var pkg_LAI    = require('users/kongdd/public:data/ImgCol_MODIS_LAI.js');
    // var pkg_export = require('users/kongdd/public:pkg_export.js');
    
    // var ImgCol = pkg_LAI.LAI_4d_mask.limit(92);
    
    // var n = ImgCol.size(),
    // win_back = 7,
    // win_forw = 6;
    // var ImgCol_mov = movmean_lst(ImgCol, n, win_back, win_forw);
    
    // Map.addLayer(ImgCol_mov);
    
    // // pkg_export.ExportImg(img, range, 'PML_global_test2002_120deg', 1/12);
    // print('Running here ...');
    // var daily_iters = ImgCol.toList(ImgCol.size()).map(function(img){
    //     return ee.Date(ee.Image(img).get('system:time_start'));
    // });
    // var prop = ImgCol.get('system:time_start');
    // // print(prop, daily_iters);
    
    // pkg_export.ExportImgCol(ImgCol_mov, daily_iters, exports.global_range, 1 / 12);
}
