const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');


const jsFiles = [
"Js/Common.js",
"Js/TextFunctions.js",
"Js/UtageParse.js",
"Js/Audio.js",
"Js/Player.js",
"Js/Main.js"
];
const jsDest = "Js";
gulp.task('minify', function() {
  // place code for your default task here
  return gulp.src(jsFiles)
		.pipe(sourcemaps.init())
        .pipe(concat('XduPlayer.js'))
        .pipe(gulp.dest(jsDest))
        .pipe(rename('XduPlayer.min.js'))
        .pipe(uglify())
		.pipe(sourcemaps.write(''))
        .pipe(gulp.dest(jsDest));
});