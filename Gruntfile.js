module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    concat: {
      options: {
        separator: '; ',
      },
      dist: {
        src: ['node_modules/es6-promise/dist/es6-promise.js', 'ProtocolWorker.js'],
        dest: 'dist/build.js',
      },
    },
    uglify: {
      options: {
        mangle: false
      },
      my_target: {
        files: {
          'dist/build.min.js': ['dist/build.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('build', ['concat', 'uglify']);
};
