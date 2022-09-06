#! /bin/sh

copy_file () {
    echo "Copying '$1'"
    cp "${WEB_PATH}/$1" "${EXPORT_PATH}/$1"
}

REL_PATH=$(dirname "$0")
WEB_PATH="${REL_PATH}/web"
EXPORT_PATH="${REL_PATH}/export"

DOMAIN_NAME="$1"

if [ -z "${DOMAIN_NAME}" ]; then
    echo "There was no domain name specified. You might want to run it with one:"
    echo "  $0 <domain-name>"
    echo
fi

if [ ! -d "${EXPORT_PATH}" ]; then
    mkdir -p "${EXPORT_PATH}"
fi

copy_file "apple-touch-icon.png"
copy_file "favicon.ico"
copy_file "favicon.svg"
copy_file "icon.svg"
copy_file "icon192.png"
copy_file "icon512.png"
copy_file "icon512-maskable.png"

copy_file "manifest.webmanifest"
copy_file "style.css"
copy_file "common.js"
copy_file "main_worker_thread.js"
copy_file "training_planner.js"

echo "Copying 'index.html'"

if [ ! -z "${DOMAIN_NAME}" ]; then
    cat "${WEB_PATH}/index.html" | \
        sed -E "s/\[domain_name\]/${DOMAIN_NAME}/" | \
        sed -E 's/<!-- <meta(.*) -->/<meta\1/g' | \
        sed -E 's/^[ ]+//g' | \
        tr -d '\n' > "${EXPORT_PATH}/index.html"
else
    cat "${WEB_PATH}/index.html" | \
        sed -E 's/<!--.*-->//g' | \
        sed -E 's/^[ ]+//g' | \
        sed -E '/^[ ]*$/d' | \
        tr -d '\n' > "${EXPORT_PATH}/index.html"
fi
