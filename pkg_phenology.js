// var pkg_pheno   = require('users/kongdd/public:pkg_phenology.js');


function getRealDOY_MOD12A1(img){
    var date   = ee.Date(img.get('system:time_start'));
    var origin = ee.Date('2000-01-01');
    
    var diff = date.difference(origin, 'day');
    img = img.subtract(diff);
    return img.select([0]).toInt()
        .set('system:time_start', date.millis());//, 1, 2, 3, 4, 5, 6
}
