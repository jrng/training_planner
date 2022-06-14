const U16MAX = 65535;

class TimeSlot
{
    constructor(trainer_id)
    {
        this.label = "";
        this.is_fixed = false;
        this.min_time = 0;
        this.max_time = 0;
        this.duration = 0;
        this.gymnast_id = -1;
        this.trainer_id = trainer_id;
        this.gymnastic_equipments = [];

        this.degree = 0;
    }

    static time_to_string(time)
    {
        let hour = Math.floor(time / 60);
        let minute = time % 60;

        return hour + ":" + ("0" + minute).slice(-2);
    }

    static share_gymnastic_equipment(a, b)
    {
        for (let i = 0; i < a.gymnastic_equipments.length; i += 1)
        {
            for (let j = 0; j < b.gymnastic_equipments.length; j += 1)
            {
                if (a.gymnastic_equipments[i] == b.gymnastic_equipments[j]) return true;
            }
        }

        return false;
    }

    static share_resource(a, b)
    {
        let result = false;

        if (a.is_fixed || b.is_fixed)
        {
            if (a.is_fixed)
            {
                result = ((a.trainer_id == b.trainer_id) || (!b.is_fixed && (a.trainer_id == b.gymnast_id)));
            }
            else if (b.is_fixed)
            {
                result = ((a.trainer_id == b.trainer_id) || (!a.is_fixed && (a.gymnast_id == b.trainer_id)));
            }
        }
        else
        {
            result = (TimeSlot.share_gymnastic_equipment(a, b) ||
                      (a.trainer_id == b.trainer_id) ||
                      (a.gymnast_id == b.gymnast_id) ||
                      (a.trainer_id == b.gymnast_id) ||
                      (a.gymnast_id == b.trainer_id));
        }

        return result;
    }

    static share_instance_resource(a_slot, a_inst, b_slot, b_inst)
    {
        let result = false;

        if (a_slot.is_fixed || b_slot.is_fixed)
        {
            if (a_slot.is_fixed)
            {
                result = ((a_slot.trainer_id == b_slot.trainer_id) ||
                          (!b_slot.is_fixed && (a_slot.trainer_id == b_slot.gymnast_id)));
            }
            else if (b_slot.is_fixed)
            {
                result = ((a_slot.trainer_id == b_slot.trainer_id) ||
                          (!a_slot.is_fixed && (a_slot.gymnast_id == b_slot.trainer_id)));
            }
        }
        else
        {
            result = ((a_slot.gymnastic_equipments[a_inst.gymnastic_equipment_index] == b_slot.gymnastic_equipments[b_inst.gymnastic_equipment_index]) ||
                      (a_slot.trainer_id == b_slot.trainer_id) ||
                      (a_slot.gymnast_id == b_slot.gymnast_id) ||
                      (a_slot.trainer_id == b_slot.gymnast_id) ||
                      (a_slot.gymnast_id == b_slot.trainer_id));
        }

        return result;
    }

    add_gymnastic_equipment(equipment_id)
    {
        this.gymnastic_equipments.push(equipment_id);
    }
};

class TimeSlotInstance
{
    constructor()
    {
        this.slot_id = 0;
        this.gymnastic_equipment_index = 0;
        this.start_time = 0;
        this.end_time = 0;
    }

    static overlap(a, b)
    {
        return ((a.start_time < b.end_time) && (a.end_time > b.start_time));
    }
};

class Backtracking
{
    static INCREMENT_TIME = 5;

    constructor(schedule)
    {
        this.schedule = schedule;
        this.slot_index = 0;
        this.slot_instances = [];
    }

    next_possible_slot()
    {
        let result = false;

        let active_instance = this.slot_instances[this.slot_index];
        let active_slot = this.schedule.time_slots[active_instance.slot_id];

        if (active_slot.duration <= (active_slot.max_time - active_slot.min_time))
        {
            let looping = true;

            if (active_instance.start_time === U16MAX)
            {
                active_instance.start_time = active_slot.min_time;
                active_instance.end_time   = active_instance.start_time + active_slot.duration;
                active_instance.gymnastic_equipment_index = 0;
            }
            else
            {
                active_instance.gymnastic_equipment_index += 1;

                if (active_instance.gymnastic_equipment_index === active_slot.gymnastic_equipments.length)
                {
                    active_instance.start_time += Backtracking.INCREMENT_TIME;
                    active_instance.end_time   += Backtracking.INCREMENT_TIME;
                    active_instance.gymnastic_equipment_index = 0;

                    if (active_instance.end_time > active_slot.max_time)
                    {
                        looping = false;
                    }
                }
            }

            while (looping)
            {
                let slot_index = 0;

                while (slot_index < this.slot_index)
                {
                    let instance = this.slot_instances[slot_index];
                    let slot = this.schedule.time_slots[instance.slot_id];

                    if (TimeSlotInstance.overlap(active_instance, instance) && TimeSlot.share_instance_resource(active_slot, active_instance, slot, instance))
                    {
                        if ((active_slot.gymnastic_equipments[active_instance.gymnastic_equipment_index] === slot.gymnastic_equipments[instance.gymnastic_equipment_index]) &&
                            (active_instance.gymnastic_equipment_index < (active_slot.gymnastic_equipments.length - 1)))
                        {
                            active_instance.gymnastic_equipment_index += 1;
                        }
                        else
                        {
                            active_instance.start_time = instance.end_time;
                            active_instance.end_time   = active_instance.start_time + active_slot.duration;
                            active_instance.gymnastic_equipment_index = 0;

                            if (active_instance.end_time > active_slot.max_time)
                            {
                                looping = false;
                            }
                        }

                        break;
                    }

                    if (!active_slot.is_fixed && !slot.is_fixed && (active_slot.gymnast_id === slot.gymnast_id))
                    {
                        let dist;

                        if (active_instance.start_time < instance.start_time)
                        {
                            dist = instance.start_time - active_instance.end_time;
                        }
                        else
                        {
                            dist = active_instance.start_time - instance.end_time;
                        }

                        if (dist < this.schedule.minimum_distance)
                        {
                            active_instance.start_time  = instance.end_time + this.schedule.minimum_distance;
                            active_instance.end_time    = active_instance.start_time + active_slot.duration;
                            active_instance.gymnastic_equipment_index = 0;

                            if (active_instance.end_time > active_slot.max_time)
                            {
                                looping = false;
                            }

                            break;
                        }
                    }

                    slot_index += 1;
                }

                if (slot_index == this.slot_index)
                {
                    result = true;
                    looping = false;
                }
            }
        }

        return result;
    }
};

class Schedule
{
    constructor(title)
    {
        this.people = [];
        this.person_counts = [];
        this.trainers = [];
        this.gymnastic_equipments = [];
        this.time_slots = [];
        this.title = title;
        this.title_was_set_by_user = false;
    }

    set_title(title)
    {
        this.title = title;
        this.title_was_set_by_user = true;
    }

    get_person_index(name)
    {
        let index = this.people.indexOf(name);

        if (index === -1)
        {
            index = this.people.length;
            this.people.push(name);
            this.person_counts.push(0);
        }

        return index;
    }

    get_gymnastic_equipment_index(name)
    {
        let index = this.gymnastic_equipments.indexOf(name);

        if (index === -1)
        {
            index = this.gymnastic_equipments.length;
            this.gymnastic_equipments.push(name);
        }

        return index;
    }

    add_unique_trainer(trainer_id)
    {
        let index = this.trainers.indexOf(trainer_id);

        if (index === -1)
        {
            index = this.trainers.length;
            this.trainers.push(trainer_id);
        }

        return index;
    }

    append_time_slot(trainer_id)
    {
        this.time_slots.push(new TimeSlot(trainer_id));
        return this.time_slots[this.time_slots.length - 1];
    }

    finalize()
    {
        this.min_time = U16MAX;
        this.max_time = 0;

        for (let i = 0; i < this.time_slots.length; i++)
        {
            let a = this.time_slots[i];

            this.min_time = Math.min(this.min_time, a.min_time);
            this.max_time = Math.max(this.max_time, a.max_time);

            for (let j = i + 1; j < this.time_slots.length; j++)
            {
                let b = this.time_slots[j];

                if (TimeSlot.share_resource(a, b))
                {
                    a.degree += 1;
                    b.degree += 1;

                    this.person_counts[a.trainer_id] += 1;
                    this.person_counts[b.trainer_id] += 1;
                }
            }
        }

        for (let i = 1; i < this.time_slots.length; i++)
        {
            for (let j = 0; j < (this.time_slots.length - i); j++)
            {
                let a = this.time_slots[j];
                let b = this.time_slots[j + 1];

                let span_a = (a.max_time - a.min_time) - a.duration;
                let span_b = (b.max_time - b.min_time) - b.duration;

                let count_a = this.person_counts[a.trainer_id];
                let count_b = this.person_counts[b.trainer_id];

                if (!a.is_fixed && (b.is_fixed ||
                    (count_a < count_b) ||
                    ((count_a == count_b) && (a.degree < b.degree)) ||
                    ((count_a == count_b) && (a.degree == b.degree) && (span_a > span_b))))
                {
                    this.time_slots[j] = b;
                    this.time_slots[j + 1] = a;
                }
            }
        }
    }

    do_collide(a_slot, a_inst, b_slot, b_inst)
    {
        if (TimeSlotInstance.overlap(a_inst, b_inst) && TimeSlot.share_instance_resource(a_slot, a_inst, b_slot, b_inst))
        {
            return true;
        }

        if (!a_slot.is_fixed && !b_slot.is_fixed && (a_slot.gymnast_id === b_slot.gymnast_id))
        {
            let dist;

            if (a_inst.start_time < b_inst.start_time)
            {
                dist = b_inst.start_time - a_inst.end_time;
            }
            else
            {
                dist = a_inst.start_time - b_inst.end_time;
            }

            if (dist < this.minimum_distance)
            {
                return true;
            }
        }

        return false;
    }

    to_string(beautify)
    {
        let result = "";

        if (beautify)
        {
            if (this.title_was_set_by_user)
            {
                result += "title = \"" + this.title + "\";\n";
            }

            result += "minimum_distance = " + this.minimum_distance + ";\n";

            for (let trainer_index = 0; trainer_index < this.trainers.length; trainer_index += 1)
            {
                let trainer_id = this.trainers[trainer_index];

                result += "\n\"" + this.people[trainer_id] + "\"\n{\n";

                for (let time_slot_index = 0; time_slot_index < this.time_slots.length; time_slot_index += 1)
                {
                    let time_slot = this.time_slots[time_slot_index];

                    if (time_slot.trainer_id === trainer_id)
                    {
                        if (time_slot.is_fixed)
                        {
                            result += "    \"" + time_slot.label + "\" [" + TimeSlot.time_to_string(time_slot.min_time) +
                                      " - " + TimeSlot.time_to_string(time_slot.max_time) + "];\n";
                        }
                        else
                        {
                            result += "    ";

                            if (time_slot.label.length)
                            {
                                result += "\"" + time_slot.label + "\" ";
                            }

                            result += "[" + TimeSlot.time_to_string(time_slot.min_time) +
                                      " - " + TimeSlot.time_to_string(time_slot.max_time) +
                                      "] \"" + this.people[time_slot.gymnast_id] + "\"";

                            if (time_slot.gymnastic_equipments.length > 1)
                            {
                                result += " (\"" + this.gymnastic_equipments[time_slot.gymnastic_equipments[0]] + "\"";

                                for (let i = 1; i < time_slot.gymnastic_equipments.length; i += 1)
                                {
                                    result += ", \"" + this.gymnastic_equipments[time_slot.gymnastic_equipments[i]] + "\"";
                                }

                                result += ")";
                            }
                            else
                            {
                                result += " \"" + this.gymnastic_equipments[time_slot.gymnastic_equipments[0]] + "\"";
                            }

                            result += " " + time_slot.duration + ";\n";
                        }
                    }
                }

                result += "}\n";
            }
        }
        else
        {
            if (this.title_was_set_by_user)
            {
                result += "title=\"" + this.title + "\";";
            }

            result += "minimum_distance=" + this.minimum_distance + ";";

            for (let trainer_index = 0; trainer_index < this.trainers.length; trainer_index += 1)
            {
                let trainer_id = this.trainers[trainer_index];

                result += "\"" + this.people[trainer_id] + "\"{";

                for (let time_slot_index = 0; time_slot_index < this.time_slots.length; time_slot_index += 1)
                {
                    let time_slot = this.time_slots[time_slot_index];

                    if (time_slot.trainer_id === trainer_id)
                    {
                        if (time_slot.is_fixed)
                        {
                            result += "\"" + time_slot.label + "\"[" + TimeSlot.time_to_string(time_slot.min_time) +
                                      "-" + TimeSlot.time_to_string(time_slot.max_time) + "];";
                        }
                        else
                        {
                            if (time_slot.label.length)
                            {
                                result += "\"" + time_slot.label + "\"";
                            }

                            result += "[" + TimeSlot.time_to_string(time_slot.min_time) +
                                      "-" + TimeSlot.time_to_string(time_slot.max_time) +
                                      "]\"" + this.people[time_slot.gymnast_id] + "\"";

                            if (time_slot.gymnastic_equipments.length > 1)
                            {
                                result += "(\"" + this.gymnastic_equipments[time_slot.gymnastic_equipments[0]] + "\"";

                                for (let i = 1; i < time_slot.gymnastic_equipments.length; i += 1)
                                {
                                    result += ",\"" + this.gymnastic_equipments[time_slot.gymnastic_equipments[i]] + "\"";
                                }

                                result += ")";
                            }
                            else
                            {
                                result += "\"" + this.gymnastic_equipments[time_slot.gymnastic_equipments[0]] + "\"";
                            }

                            result += time_slot.duration + ";";
                        }
                    }
                }

                result += "}";
            }
        }

        return result;
    }
};
