#!/bin/bash

# install `icoutils`

# e.g. make-windows-icns.sh icon.png headsoak

mkdir $2.iconset

convert -resize 16x16     $1 $2.iconset/icon_16x16.png
convert -resize 32x32     $1 $2.iconset/icon_32x32.png
convert -resize 48x48     $1 $2.iconset/icon_48x48.png
convert -resize 64x64     $1 $2.iconset/icon_64x64.png
convert -resize 128x128   $1 $2.iconset/icon_128x128.png
convert -resize 256x256   $1 $2.iconset/icon_256x256.png

icotool -c -o $2.ico $2.iconset/icon_16x16.png $2.iconset/icon_32x32.png $2.iconset/icon_48x48.png $2.iconset/icon_64x64.png $2.iconset/icon_128x128.png $2.iconset/icon_256x256.png
rm -R $2.iconset
