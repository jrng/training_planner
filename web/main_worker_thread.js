importScripts("common.js");

const ITERATIONS_PER_STEP = 50000;

(function () {
    "use strict";

    var timer = null;
    var schedule = null;
    var backtracking = null;

    var iterate = function () {
        let iteration_count = 0;

        while ((backtracking.slot_index >= 0) &&
               (backtracking.slot_index < backtracking.slot_instances.length) &&
               (iteration_count < ITERATIONS_PER_STEP))
        {
            if (backtracking.next_possible_slot())
            {
                backtracking.slot_index += 1;
            }
            else
            {
                let instance = backtracking.slot_instances[backtracking.slot_index];

                instance.gymnastic_equipment_index = U16MAX;
                instance.start_time = U16MAX;
                instance.end_time = U16MAX;

                backtracking.slot_index -= 1;
            }

            iteration_count += 1;
        }

        if (backtracking.slot_index == backtracking.slot_instances.length)
        {
            postMessage({ cmd: "found_solution", instances: backtracking.slot_instances });
        }
        else if (backtracking.slot_index < 0)
        {
            postMessage({ cmd: "no_solution" });
        }
        else
        {
            timer = setTimeout(iterate, 0);
        }
    };

    var start_solving = function () {
        backtracking = new Backtracking(schedule);

        for (let time_slot_index = 0; time_slot_index < schedule.time_slots.length; time_slot_index += 1)
        {
            let time_slot = schedule.time_slots[time_slot_index];

            let instance = new TimeSlotInstance();

            instance.slot_id = time_slot_index;
            instance.gymnastic_equipment_index = U16MAX;
            instance.start_time = U16MAX;
            instance.end_time = U16MAX;

            backtracking.slot_instances.push(instance);
        }

        timer = setTimeout(iterate, 0);
    };

    var cancel_solving = function () {
        clearTimeout(timer);
        backtracking = null;
        schedule = null;
    };

    onmessage = function (message) {
        switch (message.data.cmd)
        {
            case "start_solving":
            {
                schedule = message.data.schedule;
                start_solving();
            } break;

            case "cancel_solving":
            {
                cancel_solving();
            } break;
        }
    };

})();
