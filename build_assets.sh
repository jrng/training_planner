#! /bin/sh

if ! [ -x "$(command -v inkscape)" ]; then
    echo "'inkscape' was not found. Please install it."
    exit 1
fi

if ! [ -x "$(command -v convert)" ]; then
    echo "'convert' was not found. Please install it. This is part of ImageMagick"
    exit 1
fi

if ! [ -x "$(command -v optipng)" ]; then
    echo "'optipng' was not found. Please install it."
    exit 1
fi

# small icon

echo "Building 'favivon.ico'"
inkscape "assets/icon_small.svg" --export-width=32 --export-filename="web/tmp.png"
optipng "web/tmp.png" &> /dev/null
convert "web/tmp.png" "web/favicon.ico"
rm "web/tmp.png"

echo "Building 'favicon.svg'"
inkscape "assets/icon_small.svg" --export-plain-svg --export-filename=- | \
    sed 's/^[ ]\+/ /;s/<!--.*-->//g' | \
    tr -d '\n' | \
    sed 's/> </></g;s/ \/>/\/>/g' > "web/favicon.svg"
echo "" >> "web/favicon.svg"

# large icon

echo "Building 'icon192.png'"
inkscape "assets/icon_large.svg" --export-width=192 --export-filename="web/icon192.png"
optipng "web/icon192.png" &> /dev/null

echo "Building 'icon512.png'"
inkscape "assets/icon_large.svg" --export-width=512 --export-filename="web/icon512.png"
optipng "web/icon512.png" &> /dev/null

echo "Building 'icon512-maskable.png'"
inkscape "assets/icon_large.svg" --export-width=352 --export-filename="web/tmp.png"
convert "web/tmp.png" -background "#1c1d27" -gravity center -extent 512x512 "web/icon512-maskable.png"
optipng "web/icon512-maskable.png" &> /dev/null
rm "web/tmp.png"

echo "Building 'apple-touch-icon.png'"
inkscape "assets/icon_large.svg" --export-width=140 --export-filename="web/tmp.png"
convert "web/tmp.png" -background "#1c1d27" -gravity center -extent 180x180 "web/apple-touch-icon.png"
optipng "web/apple-touch-icon.png" &> /dev/null
rm "web/tmp.png"
