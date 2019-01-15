const gulp = require('gulp')
const sass = require('gulp-sass')
const postcss = require('gulp-postcss')
const sprite = require('postcss-auto-sprite')
const del = require('del')

gulp.task('clean', () => {
    return del(['./dist/img'])
})
gulp.task('img', gulp.series('clean', () => {
    return gulp
        .src([
            './src/img/*.*',
            './src/img/**/*',
            '!./src/img/slice/**/*'
        ])
        .pipe(gulp.dest('./dist/img'))
}))

gulp.task('sass', gulp.series('clean', () => {
    return gulp
        .src('./src/sass/*.scss')
        .pipe(
            sass({
                outputStyle: 'compressed'
            }).on('error', sass.logError)
        )
        .pipe(
            postcss([
                sprite({
                    imgPath: __dirname + '/src/img/',
                    sliceDir: "slice",
                    spriteDir: "sprite",
                    spriteDisplay: "../img/sprite/",
                    revision: 'query',
                    unit: 'px',
                    spritesmithOptions: {
                        padding: 10
                    }
                })
            ])
        )
        .pipe(gulp.dest('./dist/css'))
}))

gulp.task('default', gulp.series('sass', 'img'))