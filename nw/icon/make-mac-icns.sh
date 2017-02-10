#!/bin/bash

# @NOTE The file `make-mac-icns-sips.sh` is better. This one does not seem to support retina icons (even though `libicns` docs suggest there is support).

# install `libicns`

# e.g. make-mac-icns.sh icon.png headsoak

mkdir $2.iconset

convert -resize 16x16     $1 $2.iconset/icon_16x16.png
# convert -resize 32x32     $1 $2.iconset/icon_16x16@2x.png
convert -resize 32x32     $1 $2.iconset/icon_32x32.png
# convert -resize 64x64     $1 $2.iconset/icon_32x32@2x.png
convert -resize 128x128   $1 $2.iconset/icon_128x128.png
# convert -resize 256x256   $1 $2.iconset/icon_128x128@2x.png
convert -resize 256x256   $1 $2.iconset/icon_256x256.png
# convert -resize 512x512   $1 $2.iconset/icon_256x256@2x.png
convert -resize 512x512   $1 $2.iconset/icon_512x512.png
# convert -resize 1024x1024 $1 $2.iconset/icon_512x512@2x.png

png2icns $2.icns $2.iconset/*.png
rm -R $2.iconset
