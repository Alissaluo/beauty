// var pkg_main   = require('users/kongdd/public:pkg_main.js');
var global_prop = ['system:id', 'system:time_start', 'system:time_end']; //, 'system:index'

var addYearProp = function(img) {
    return img.set('year', ee.Date(img.get('system:time_start')).get('year'));
};
var addDateProp = function(img) {
    return img.set('date', ee.Date(img.get('system:time_start')).format('yyyy-MM-dd'));
};

/**
 * setImgProperties 
 * 
 * add properties, i.e., [system:time_start, system:time_end, system:id] to Image
 *           
 * @param {Image}   img       [description]
 * @param {ee.Date} beginDate [description]
 */
function setImgProperties(img, beginDate) {
    beginDate = ee.Date(beginDate);
    return ee.Image(img)
        .set('system:time_start', beginDate.millis())
        // .set('system:time_end', beginDate.advance(1, 'day').millis())
        .set('system:id', beginDate.format('yyyy-MM-dd'));
}

exports = {
    global_prop     : global_prop,
    addYearProp     : addYearProp,
    addDateProp     : addDateProp,
    setImgProperties: setImgProperties
};
