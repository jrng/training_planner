importScripts("common.js");

const ITERATIONS_PER_STEP = 50000;

(function () {
    "use strict";

    var timer = null;
    var schedule = null;
    var backtracking = null;

    var last_sent_index = 0;
    var best_slot_index = 0;
    var best_slot_instances = [];

    var iterate = function () {
        let iteration_count = 0;

        while ((backtracking.slot_index >= 0) &&
               (backtracking.slot_index < backtracking.slot_instances.length) &&
               (iteration_count < ITERATIONS_PER_STEP))
        {
            if (backtracking.next_possible_slot())
            {
                backtracking.slot_index += 1;

                if (backtracking.slot_index > best_slot_index)
                {
                    best_slot_index = backtracking.slot_index;

                    for (let i = 0; i < best_slot_index; i += 1)
                    {
                        best_slot_instances[i] = Object.assign({}, backtracking.slot_instances[i]);
                    }
                }
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
            if (best_slot_index > last_sent_index)
            {
                last_sent_index = best_slot_index;
                postMessage({ cmd: "solve_status", best_slot_count: best_slot_index, instances: best_slot_instances });
            }

            timer = setTimeout(iterate, 0);
        }
    };

    var start_solving = function (sched, initial_instances) {
        if (initial_instances.length === sched.time_slots.length)
        {
            schedule = sched;
            backtracking = new Backtracking(schedule);

            last_sent_index = 0;
            best_slot_index = 0;
            best_slot_instances = [];

            for (let time_slot_index = 0; time_slot_index < schedule.time_slots.length; time_slot_index += 1)
            {
                let time_slot = schedule.time_slots[time_slot_index];

                let instance = new TimeSlotInstance();

                instance.slot_id = time_slot_index;
                instance.gymnastic_equipment_index = U16MAX;
                instance.start_time = U16MAX;
                instance.end_time = U16MAX;

                backtracking.slot_instances.push(instance);

                for (let i = 0; i < initial_instances.length; i += 1)
                {
                    if (initial_instances[i].slot_id == instance.slot_id)
                    {
                        best_slot_instances.push(initial_instances[i]);
                        break;
                    }
                }
            }

            timer = setTimeout(iterate, 0);
        }
        else
        {
            // TODO: better message. This is an application error, not a 'no solution' message.
            postMessage({ cmd: "no_solution" });
        }
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
                start_solving(message.data.schedule, message.data.instances);
            } break;

            case "cancel_solving":
            {
                cancel_solving();
            } break;
        }
    };

})();
