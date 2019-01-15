# Postcss Auto Sprite

PostCSS Auto Sprite plugin that generates css and sprites which grouped by directory from your stylesheets

## Installation

```bash
$ npm install postcss-auto-sprite --save-dev
```

## Usage

### Use gulp

```js
const gulp = require("gulp");
const postcss = require("gulp-postcss");
const sprite = require("postcss-auto-sprite");
gulp.task("css", () => {
  return gulp
    .src("*.css")
    .pipe(
      postcss([
        sprite({
          imgPath: __dirname + "/img/",
          sliceDir: "slice",
          spriteDir: "sprite",
          spriteDisplay: "../img/sprite",
          revision: "query", // 'filename' or 'query'
          unit: "px", // 'px' or 'rem'
          spritesmithOptions: {
            padding: 10
          },
          revision: true
        })
      ])
    )
    .pipe(gulp.dest("./dist/css"));
});
```

Before:

```CSS
.icon1{
  background-image: url('../img/slice/dir1/icon_1.png');
}
.icon2{
  background-image: url('../img/slice/dir1/icon_2.png');
}
.icon3{
  background-image: url('../img/slice/dir2/icon_3.png');
}
.icon4{
  background-image: url('../img/slice/dir2/icon_4.png');
}
```

After:

```CSS
.icon1{
  width: 20px;
  height: 20px;
  background-image: url('../img/sprite/dir1.png');
  background-position: 0px 0px;
  background-size: 50px auto
}
.icon2{
  width: 20px;
  height: 20px;
  background-image: url('../img/sprite/dir1.png');
  background-position: -30px 0px;
  background-size: 50px auto
}
.icon3{
  width: 20px;
  height: 20px;
  background-image: url('../img/sprite/dir2.png');
  background-position: 0px 0px;
  background-size: 50px auto
}
.icon4{
  width: 20px;
  height: 20px;
  background-image: url('../img/sprite/dir2.png');
  background-position: -30px 0px;
  background-size: 50px auto
}
```
