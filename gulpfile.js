const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const cssmin = require('gulp-cssmin');
const jsonmin = require('gulp-jsonminify');

const jsFiles = [
"Js/Common.js",
"Js/TextFunctions.js",
"Js/UtageParse.js",
"Js/Audio.js",
"Js/Player.js",
"Js/Main.js"
];
const jsToCopy = [
"Js/XduPlayer.min.js", 
"Js/Pixi.min.js"
];
const cssFiles = [
"Css/main.css"
];
const cssToCopy = [
"Css/main.min.css",
"Css/generic.min.css"
];
const jsonFiles = [
"Js/BgmLoop.json",
"Js/XduMissions.json"
];

const jsDest = "Js";
gulp.task('dev', gulp.series(
		buildJs,
		buildCss,
	)
);

gulp.task('dist', gulp.series(
	gulp.parallel(
			gulp.series(
				buildJs,
				copyJs
			),
			gulp.series(
				buildCss,
				copyCss
			),
			buildJson,
			copyHtml,
			copyImages
		),
	)
);

gulp.task('watch', () => {
	gulp.watch(cssFiles, {ignoreInitial: false}, gulp.series(buildCss)),
	gulp.watch(jsFiles, {ignoreInitial: false}, gulp.series(buildJs));
});

function buildJs() {
	return gulp.src(jsFiles)
		.pipe(sourcemaps.init())
		.pipe(concat('XduPlayer.js'))
		.pipe(gulp.dest(jsDest))
		.pipe(rename('XduPlayer.min.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write(''))
		.pipe(gulp.dest(jsDest));
}

function copyJs() {
	return gulp.src(jsToCopy)
		.pipe(gulp.dest('Dist/Js'));
}

function buildCss() {
	return gulp.src('Css/main.css')
        .pipe(cssmin())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('Css'));
}

function copyCss() {
	return gulp.src(cssToCopy)
		.pipe(gulp.dest('Dist/Css'));
}

function copyHtml() {
	return gulp.src('Player.html')
		.pipe(gulp.dest('Dist'));
}

function copyImages() {
	return gulp.src('Images/**')
		.pipe(gulp.dest('Dist/Images'));
}

function buildJson() {
	return gulp.src(jsonFiles)
        .pipe(jsonmin())
        .pipe(gulp.dest('Dist/Js'));
}