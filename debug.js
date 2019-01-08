// var pkg_debug = require('users/kongdd/public:debug.js');

/** 
 * split exporting range into multiple piece
 *
 * @param {[type]} range  [description]
 * @param {[type]} nx     [description]
 * @param {[type]} ny     [description]
 * @param {[type]} prefix [description]
 *
 * @examples
 * var range  = [-180, -60, 180, 90];
 * var ranges = SplitGrids(range, 2, 2, "prefix_"); 
 * print(ranges);
 * ranges.forEach(function(dict, ind){
 *     pkg_export.ExportImg(img_out, dict.range, dict.file, 1/240, 'drive', "");
 * });
 */
function SplitGrids(range, nx, ny, prefix) {
    nx = nx || 4;
    ny = ny || nx;
    prefix = prefix || "";

    var lat_range = range[3] - range[1],
        lon_range = range[2] - range[0],
        dy = lat_range / ny,
        dx = lon_range / nx;
    // print(lon_range, lat_range, dx, dy);

    var file, range_ij, lat_min, lat_max, lon_min, lon_max;
    var tasks = [],
        task;
    for (var i = 0; i < nx; i++) {
        lon_min = range[0] + i * dx;
        lon_max = lon_min + dx;
        for (var j = 0; j < ny; j++) {
            lat_min = range[1] + j * dy;
            lat_max = lat_min + dy;

            range_ij = [lon_min, lat_min, lon_max, lat_max];
            file = prefix + i.toString() + '_' + j.toString();
            tasks.push({ range: range_ij, file: file });
            // print(file, range_ij);
        }
    }
    return tasks;
}
exports = {
    SplitGrids: SplitGrids,
}