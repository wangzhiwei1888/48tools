# 口袋48工具

## 功能
* 成员直播录源
* 成员录播下载
* B站视频录源
* 视频剪切

## 许可证
本软件遵循**GNU General Public License v3.0**许可证。

## 技术栈
pug + sass + ECMA8 + react + antd + webpack + nwjs。  

## nwjs中文文档
> nwjs请使用0.23版本，0.24版本已知会出现ffmpeg获取视频流时卡住的bug。
[https://wizardforcel.gitbooks.io/nwjs-doc/content/wiki/index.html](https://wizardforcel.gitbooks.io/nwjs-doc/content/wiki/index.html)

## 谷歌扩展
* 教程参考：[http://www.ituring.com.cn/book/1421](http://www.ituring.com.cn/book/1421)
* api文档：[https://developer.chrome.com/extensions/api_index](https://developer.chrome.com/extensions/api_index)

## 文件
* app: 源代码
* ffmpeg: ffmpeg文件存储目录
* output: 视频输出目录

## 关于dll
无论是开发环境还是生产环境，首先要编译dll文件，将公共模块提取出来。

## 关于node-sass
node-sass如果安装失败，可以先到[https://github.com/sass/node-sass/releases](https://github.com/sass/node-sass/releases)下载binding.node文件，然后将该文件添加到SASS_BINARY_PATH环境变量内。

## video无法观看的解决办法
请到[https://github.com/iteufel/nwjs-ffmpeg-prebuilt/releases](https://github.com/iteufel/nwjs-ffmpeg-prebuilt/releases)地址下载对应的ffmpeg.dll并覆盖到源目录中

## 源代码托管地址
[https://github.com/duan602728596/48tools](https://github.com/duan602728596/48tools)