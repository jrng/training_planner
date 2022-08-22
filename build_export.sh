#! /bin/sh

REL_PATH=$(dirname "$0")
WEB_PATH="${REL_PATH}/web"
EXPORT_PATH="${REL_PATH}/export"

DOMAIN_NAME="$1"

if [ ! -d "${EXPORT_PATH}" ]; then
    mkdir -p "${EXPORT_PATH}"
fi

cp "${WEB_PATH}/apple-touch-icon.png" "${EXPORT_PATH}/apple-touch-icon.png"
cp "${WEB_PATH}/favicon.ico" "${EXPORT_PATH}/favicon.ico"
cp "${WEB_PATH}/favicon.svg" "${EXPORT_PATH}/favicon.svg"
cp "${WEB_PATH}/icon.svg" "${EXPORT_PATH}/icon.svg"
cp "${WEB_PATH}/icon192.png" "${EXPORT_PATH}/icon192.png"
cp "${WEB_PATH}/icon512.png" "${EXPORT_PATH}/icon512.png"
cp "${WEB_PATH}/icon512-maskable.png" "${EXPORT_PATH}/icon512-maskable.png"

cp "${WEB_PATH}/manifest.webmanifest" "${EXPORT_PATH}/manifest.webmanifest"
cp "${WEB_PATH}/style.css" "${EXPORT_PATH}/style.css"
cp "${WEB_PATH}/common.js" "${EXPORT_PATH}/common.js"
cp "${WEB_PATH}/main_worker_thread.js" "${EXPORT_PATH}/main_worker_thread.js"
cp "${WEB_PATH}/training_planner.js" "${EXPORT_PATH}/training_planner.js"

if [ ! -z "${DOMAIN_NAME}" ]; then
    cat "${WEB_PATH}/index.html" | \
        sed "s/\[domain_name\]/${DOMAIN_NAME}/" | \
        sed 's/<!-- <meta\(.*\) -->/<meta\1/g' | \
        sed 's/^[ ]\+//g' | \
        tr -d '\n' > "${EXPORT_PATH}/index.html"
else
    cat "${WEB_PATH}/index.html" | \
        sed 's/<!--.*-->//g' | \
        sed 's/^[ ]\+//g' | \
        sed '/^[ ]*$/d' | \
        tr -d '\n' > "${EXPORT_PATH}/index.html"
fi
