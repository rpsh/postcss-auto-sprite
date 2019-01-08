const path = require("path");
const promisify = require("util").promisify;
const fs = require("fs-extra");
const revHash = require('rev-hash');
const spritesmith = promisify(require("spritesmith").run);
const SVGSpriter = require("svg-sprite");
const postcss = require("postcss");

var SVG_CONFIG = {
    mode: {
        css: {
            dimensions: true,
            bust: false,
            render: {
                scss: true
            }
        }
    },
    shape: {
        id: {
            generator: function (name, file) {
                return file.path;
            }
        },
        transform: ['svgo'],
    }
};

function isdelProp(prop) {
    return !!~[
        "width",
        "height",
        "background-size",
        "background-position"
    ].indexOf(prop);
}

function getUrl(url) {
    try {
        url = url.match(/url\((?:['"])?([^\)'"]+)(?:['"])?\)/)[1];
    } catch (e) {}

    return url;
}

function getDpr(url) {
    let dpr;
    try {
        dpr = url.match(/@(\d)x/)[1];
    } catch (e) {}
    return dpr;
}

/* 将图片 url 按目录进行分组 */
function groupingURL(src) {
    let groupSrc = {
        img: [],
        svg: []
    };
    let dir = new Set();

    src.forEach(item => {
        path.dirname(item) && dir.add(path.dirname(item));
    });

    let i = 0;
    dir.forEach((value, key) => {
        groupSrc.img[i] = [];
        groupSrc.svg[i] = [];
        src.forEach(item => {
            if (path.dirname(item) === value) {
                if (path.extname(item) === ".svg") {
                    groupSrc.svg[i].push(item);
                } else {
                    groupSrc.img[i].push(item);
                }
            }
        });
        i++;
    });
    groupSrc.img = groupSrc.img.filter(n => n.length && n);
    groupSrc.svg = groupSrc.svg.filter(n => n.length && n);
    return groupSrc;
}

function appendObject(target, sources) {
    Object.keys(target).forEach(key => {
        target[key] = Object.assign(target[key], sources);
    });
    return target;
}

function getDir(url, outputPath, ext) {
    let dirname = path.dirname(url);
    dirname = dirname !== '.' ? dirname : 'sprite'
    return path.join(
        outputPath,
        dirname
        .split(path.sep)
        .join("_")
        .replace(/\.+/g, "") +
        "." + ext
    )
}

module.exports = postcss.plugin("postcss-sprite", (options = {}) => {
    let {
        baseSize = 16,
            imgPath = "../img/",
            sliceDir = "slice",
            spriteDir = "sprite",
            spriteDisplay = "../img/sprite",
            filter = url => ~url.indexOf(sliceDir + "/"),
            replaceUrl,
            spritesmithOptions = {},
            revision = true
    } = options;

    replaceUrl || (replaceUrl = spriteName => spriteDisplay + spriteName);

    let sourcePath = imgPath + sliceDir + "/",
        outputPath = path.resolve(imgPath + spriteDir);

    return root => {
        let rules = [];
        let src = [];
        let groupSrc = [];

        root.walkRules(rule => {
            rule.walkDecls(/background-image/, decl => {
                // 提取图片 url
                let url = getUrl(decl.value);
                if (!filter(url)) {
                    return;
                }

                url = url.split(sliceDir + "/")[1];

                if (src.indexOf(url) == -1) {
                    // 去重复
                    src.push(url);
                }
                rules.push(rule);
            });
        });

        if (src.length == 0) {
            return;
        }

        groupSrc = groupingURL(src);

        let spritePromises = [];
        let spriteNames = {
            img: [],
            svg: []
        };
        let spriteSoordinates = {};
        svgConfig = SVG_CONFIG;

        groupSrc.img.forEach((spriteItem, index) => {
            spriteNames.img.push(
                getDir(spriteItem[0], outputPath, 'png')
            );

            spritePromises.push(
                spritesmith(
                    Object.assign({
                            src: spriteItem.map(url => path.resolve(sourcePath, url))
                        },
                        spritesmithOptions
                    )
                )
            );
        });

        // svg sprite
        groupSrc.svg.forEach((spriteItem, index) => {
            spriteNames.svg.push(
                getDir(spriteItem[0], outputPath, 'svg')
            );

            let svgSpriter = new SVGSpriter(svgConfig);
            spriteItem.forEach(url => {
                svgSpriter.add(
                    path.resolve(sourcePath, url),
                    null,
                    fs.readFileSync(path.resolve(sourcePath, url), {
                        encoding: "utf-8"
                    })
                );
            });

            svgSpriter.compile(function (error, result, data) {

                // 保存 svg sprite 到 sprite 目录
                fs.outputFileSync(
                    spriteNames.svg[index],
                    result.css.sprite.contents
                );

                data.css.shapes.forEach(item => {
                    let rev = revHash(result.css.sprite.contents);

                    spriteSoordinates[item.name] = {
                        x: item.position.absolute.x * -1,
                        y: item.position.absolute.y * -1,
                        width: item.width.inner,
                        height: item.height.inner,
                        spriteWidth: data.css.spriteWidth,
                        spriteHeight: data.css.spriteHeight,
                        spriteName: spriteNames.svg[index],
                        rev: rev
                    }
                })
            });
        });

        return Promise.all(spritePromises)
            .then(result => {
                result.forEach(async (item, index) => {
                    let rev = revHash(item.image);
                    fs.outputFileSync(spriteNames.img[index], item.image);
                    Object.assign(
                        spriteSoordinates,
                        appendObject(item.coordinates, {
                            spriteWidth: item.properties.width,
                            spriteHeight: item.properties.height,
                            spriteName: spriteNames.img[index],
                            rev: rev
                        })
                    );
                });
                return Promise.resolve(spriteSoordinates);
            })
            .then(async result => {

                // 先删除
                rules.forEach(rule => {
                    rule.walkDecls(decl => {
                        let prop = decl.prop;
                        if (isdelProp(prop)) {
                            decl.remove();
                        }
                    });
                });

                // 再添加
                rules.forEach(rule => {
                    rule.walkDecls(decl => {
                        let prop = decl.prop;
                        if (prop != "background-image") {
                            return;
                        }

                        let url = decl.value;
                        let dpr = getDpr(url);
                        url = getUrl(url).split(sliceDir + "/")[1];

                        let {
                            width: w,
                            height: h,
                            x,
                            y,
                            spriteWidth,
                            spriteHeight,
                            spriteName,
                            rev
                        } = result[path.resolve(sourcePath, url)];

                        let unit = "px";

                        if (dpr) {
                            let size = dpr * baseSize;
                            unit = "rem";
                            w /= size;
                            h /= size;
                            x /= size;
                            y /= size;
                            spriteWidth /= size;
                            spriteHeight /= size;
                        }

                        let _url = replaceUrl(path.basename(spriteName));

                        if (revision) {
                            _url += `?v=${rev}`;
                        }

                        decl.value = `url("${_url}")`;

                        rule.insertAfter(0, {
                                prop: "width",
                                value: `${w}${unit}`
                            })
                            .insertAfter(1, {
                                prop: "height",
                                value: `${h}${unit}`
                            })
                            .insertAfter(2, {
                                prop: "background-position",
                                value: `${-x}${unit} ${-y}${unit}`
                            })
                            .insertAfter(3, {
                                prop: "background-size",
                                value: `${spriteWidth}${unit} auto`
                            });
                    });
                });
            })
            .catch(error => {
                console.log("error", error);
            });
    };
});