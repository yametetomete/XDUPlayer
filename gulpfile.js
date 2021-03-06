const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const cssmin = require('gulp-cssmin');
const jsonmin = require('gulp-jsonminify');

const jsFiles = [
"Js/Common.js",
"Js/Shaders.js",
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
const translations = [
"Js/Translations/**"
];

const jsDest = "Js";
gulp.task('dev', gulp.series(
		buildJsDev,
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
			buildJsonTranslations,
			copyHtml,
			copyImages,
			copyCustomData
		),
	)
);

gulp.task('watch', () => {
	gulp.watch(cssFiles, {ignoreInitial: false}, gulp.series(buildCss)),
	gulp.watch(jsFiles, {ignoreInitial: false}, gulp.series(buildJsDev));
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

function buildJsDev() {
	return gulp.src(jsFiles)
		.pipe(sourcemaps.init())
		.pipe(concat('XduPlayer.js'))
		.pipe(gulp.dest(jsDest))
		.pipe(rename('XduPlayer.min.js'))
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

function copyCustomData() {
	return gulp.src('CustomData/**')
		.pipe(gulp.dest('Dist/CustomData'));
}

function buildJsonTranslations() {
	return gulp.src(translations)
        .pipe(jsonmin())
        .pipe(gulp.dest('Dist/Js/Translations'));
}
