var path = require('path');
var copydir = require('copy-dir');

function init() {

    console.log('init!');
   
    copydir.sync('X:/GitHub_Repositories/svelthree-three', 'X:/GitHub_Repositories/svelthree/src/types/svelthree-three', {
        filter: function(stat, filepath, filename){
            // do not want copy .html files
            if(stat === 'file' && path.extname(filepath) === '.js') {
              return false;
            }

            if(stat === 'file' && path.extname(filepath) === '.json') {
                return false;
            }

            if(stat === 'file' && path.extname(filepath) === '.md') {
                return false;
            }

            if(stat === 'file' && path.extname(filename) === '.gitattributes') {
                return false;
            }

            if(stat === 'file' && path.extname(filename) === 'LICENCE') {
                return false;
            }

            if (stat === 'directory' && filename === 'examples') {
                return false;
            }

            return true;  // remind to return a true value when file check passed.
          }
      });
   

     console.log('done');  

}
 

init()