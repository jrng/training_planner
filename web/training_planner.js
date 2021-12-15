(function (document) {
    "use strict";

    var file_picker = null;

    var load_plan = function (str) {
    };

    var on_file_selected = function () {
        let blob = file_picker.files[0];
        blob.text().then(str => load_plan(str));
    };

    var open_file = function () {
        file_picker.click();
    };

    var save_file = function () {
    };

    var export_pdf = function () {
    };

    var start_solving = function () {
    };

    var init = function () {
        file_picker = document.createElement("input");
        file_picker.type = "file";
        file_picker.addEventListener("change", on_file_selected);

        document.getElementById("open_file").addEventListener("click", open_file);
        document.getElementById("save_file").addEventListener("click", save_file);
        document.getElementById("export_pdf").addEventListener("click", export_pdf);
        document.getElementById("start_solving").addEventListener("click", start_solving);
    };

    document.addEventListener("DOMContentLoaded", init);

})(document);
