const GYMNASTIC_EQUIPMENT_COLORS = [
    { foreground: "darkslategray" , background: "darkseagreen"   },
    { foreground: "gold"          , background: "goldenrod"      },
    { foreground: "lightsteelblue", background: "lightslategray" },
    { foreground: "salmon"        , background: "firebrick"      },
    { foreground: "seashell"      , background: "silver"         },
    { foreground: "turquoise"     , background: "teal"           },
];

class Parser
{
    static TOKEN_UNKNOWN        = Symbol("TOKEN_UNKNOWN");
    static TOKEN_LEFT_PAREN     = Symbol("TOKEN_LEFT_PAREN");
    static TOKEN_RIGHT_PAREN    = Symbol("TOKEN_RIGHT_PAREN");
    static TOKEN_COMMA          = Symbol("TOKEN_COMMA");
    static TOKEN_MINUS          = Symbol("TOKEN_MINUS");
    static TOKEN_SEMICOLON      = Symbol("TOKEN_SEMICOLON");
    static TOKEN_ASSIGN         = Symbol("TOKEN_ASSIGN");
    static TOKEN_LEFT_BRACKET   = Symbol("TOKEN_LEFT_BRACKET");
    static TOKEN_RIGHT_BRACKET  = Symbol("TOKEN_RIGHT_BRACKET");
    static TOKEN_LEFT_BRACE     = Symbol("TOKEN_LEFT_BRACE");
    static TOKEN_RIGHT_BRACE    = Symbol("TOKEN_RIGHT_BRACE");
    static TOKEN_DISTANCE       = Symbol("TOKEN_DISTANCE");
    static TOKEN_STRING         = Symbol("TOKEN_STRING");
    static TOKEN_NUMBER         = Symbol("TOKEN_NUMBER");
    static TOKEN_TIME           = Symbol("TOKEN_TIME");
    static TOKEN_COMMENT        = Symbol("TOKEN_COMMENT");
    static TOKEN_END_OF_INPUT   = Symbol("TOKEN_END_OF_INPUT");
    static TOKEN_ERROR          = Symbol("TOKEN_ERROR");

    constructor(input)
    {
        this.had_error          = false;
        this.panic_mode         = false;
        this.current_index      = 0;
        this.current_line       = 1;
        this.current_character  = 1;
        this.content            = input;
        this.current_token      = { kind: Parser.TOKEN_UNKNOWN, i0: 0, l0: 0, c0: 0, i1: 0, l1: 0, c1: 0 };
        this.previous_token     = { kind: Parser.TOKEN_UNKNOWN, i0: 0, l0: 0, c0: 0, i1: 0, l1: 0, c1: 0 };
    }

    static is_whitespace(c)
    {
        return ((c == ' ') || (c == '\t') || (c == '\r') || (c == '\n'));
    }

    static is_digit(c)
    {
        return ((c >= '0') && (c <= '9'));
    }

    static is_alpha(c)
    {
        return ((c >= 'a') && (c <= 'z')) || ((c >= 'A') && (c <= 'Z')) || (c == '_');
    }

    is_at_end()
    {
        return (this.current_index >= this.content.length);
    }

    peek()
    {
        return this.content.at(this.current_index);
    }

    advance_character()
    {
        let c = this.content.at(this.current_index);

        if (c === '\n')
        {
            this.current_line += 1;
            this.current_character = 1;
        }

        this.current_index += 1;

        return c;
    }

    make_token(token_kind)
    {
        this.current_token.kind = token_kind;
        this.current_token.i1   = this.current_index;
        this.current_token.l1   = this.current_line;
        this.current_token.c1   = this.current_character;
    }

    parse_identifier()
    {
        while (!this.is_at_end())
        {
            let c = this.peek();

            if (Parser.is_alpha(c) || Parser.is_digit(c))
            {
                this.advance_character();
            }
            else
            {
                break;
            }
        }

        let token_str = this.content.slice(this.current_token.i0, this.current_index);

        if (token_str === "minimum_distance")
        {
            this.make_token(Parser.TOKEN_DISTANCE);
        }
        else
        {
            this.make_token(Parser.TOKEN_ERROR);
        }
    }

    parse_string()
    {
        this.current_token.i0 = this.current_index;
        this.current_token.l0 = this.current_line;
        this.current_token.c0 = this.current_character;

        while (!this.is_at_end())
        {
            let c = this.peek();

            if ((c == '\n') || (c == '\r')) break;

            if (c == '"')
            {
                this.make_token(Parser.TOKEN_STRING);
                this.advance_character();
                break;
            }

            this.advance_character();
        }

        if (this.is_at_end())
        {
            this.make_token(Parser.TOKEN_STRING);
        }
    }

    parse_number_or_time()
    {
        let token_kind = Parser.TOKEN_NUMBER;

        while (!this.is_at_end() && Parser.is_digit(this.peek()))
        {
            this.advance_character();
        }

        if (!this.is_at_end() && (this.peek() == ':'))
        {
            this.advance_character();
            token_kind = Parser.TOKEN_TIME;

            while (!this.is_at_end() && Parser.is_digit(this.peek()))
            {
                this.advance_character();
            }
        }

        this.make_token(token_kind);
    }

    advance_token()
    {
        while (!this.is_at_end())
        {
            let c = this.peek();

            if (Parser.is_whitespace(c))
            {
                this.advance_character();
            }
            else if (c == '/')
            {
                this.advance_character();

                if (!this.is_at_end() && (this.peek() == '/'))
                {
                    this.advance_character();

                    while (!this.is_at_end() && (this.peek() != '\n'))
                    {
                        this.advance_character();
                    }
                }
                else if (!this.is_at_end() && (this.peek() == '*'))
                {
                    this.advance_character();

                    while (!this.is_at_end())
                    {
                        c = this.advance_character();

                        if ((c == '*') && !this.is_at_end() && (this.peek() == '/'))
                        {
                            this.advance_character();
                            break;
                        }
                    }
                }
                else
                {
                    this.make_token(Parser.TOKEN_ERROR);
                    return;
                }
            }
            else
            {
                break;
            }
        }

        this.current_token.i0 = this.current_index;
        this.current_token.l0 = this.current_line;
        this.current_token.c0 = this.current_character;

        if (this.is_at_end())
        {
            this.make_token(Parser.TOKEN_END_OF_INPUT);
            return;
        }

        let c = this.peek();

        if (Parser.is_digit(c))
        {
            this.parse_number_or_time();
            return;
        }

        if (Parser.is_alpha(c))
        {
            this.parse_identifier();
            return;
        }

        this.advance_character();

        switch (c)
        {
            case '(': this.make_token(Parser.TOKEN_LEFT_PAREN);    return;
            case ')': this.make_token(Parser.TOKEN_RIGHT_PAREN);   return;
            case ',': this.make_token(Parser.TOKEN_COMMA);         return;
            case '-': this.make_token(Parser.TOKEN_MINUS);         return;
            case ';': this.make_token(Parser.TOKEN_SEMICOLON);     return;
            case '=': this.make_token(Parser.TOKEN_ASSIGN);        return;
            case '[': this.make_token(Parser.TOKEN_LEFT_BRACKET);  return;
            case ']': this.make_token(Parser.TOKEN_RIGHT_BRACKET); return;
            case '{': this.make_token(Parser.TOKEN_LEFT_BRACE);    return;
            case '}': this.make_token(Parser.TOKEN_RIGHT_BRACE);   return;
            case '"': this.parse_string();                         return;
        }

        this.make_token(Parser.TOKEN_ERROR);
    }

    advance()
    {
        this.previous_token.kind    = this.current_token.kind;
        this.previous_token.i0      = this.current_token.i0;
        this.previous_token.l0      = this.current_token.l0;
        this.previous_token.c0      = this.current_token.c0;
        this.previous_token.i1      = this.current_token.i1;
        this.previous_token.l1      = this.current_token.l1;
        this.previous_token.c1      = this.current_token.c1;

        while (true)
        {
            this.advance_token();

            if (this.current_token.kind !== Parser.TOKEN_ERROR)
            {
                break;
            }
        }
    }

    report_error(message, line, character)
    {
        if (this.panic_mode) return;

        this.had_error  = true;
        this.panic_mode = true;

        console.error("line " + line + ", character " + character + ": " + message);
    }

    consume(token_kind, message)
    {
        if (this.current_token.kind == token_kind)
        {
            this.advance();
        }
        else
        {
            if (token_kind == Parser.TOKEN_SEMICOLON)
            {
                this.report_error(message, this.previous_token.l1, this.previous_token.c1);
            }
            else
            {
                this.report_error(message, this.current_token.l0, this.current_token.c0);
            }
        }
    }

    parse_number(message)
    {
        this.consume(Parser.TOKEN_NUMBER, message);

        let value = Number(this.content.slice(this.previous_token.i0, this.previous_token.i1));

        if (value > U16MAX)
        {
            this.report_error("Numbers can not be greater than " + U16MAX + ".", this.previous_token.l0, this.previous_token.c0);
        }

        return value;
    }

    parse_time(message)
    {
        this.consume(Parser.TOKEN_TIME, message);

        let token_str = this.content.slice(this.previous_token.i0, this.previous_token.i1);
        let time_array = token_str.split(':');
        let hour = Number(time_array[0]);
        let minute = Number(time_array[1]);

        return 60 * hour + minute;
    }

    parse_distance(schedule)
    {
        this.consume(Parser.TOKEN_ASSIGN, "Expected '=' after 'minimum_distance'.");

        schedule.minimum_distance = this.parse_number("'minimum_distance' has to be a number.");

        this.consume(Parser.TOKEN_SEMICOLON, "Expected ';' after assignment.");
    }

    parse_trainer(schedule)
    {
        let trainer_id = schedule.get_person_index(this.content.slice(this.previous_token.i0, this.previous_token.i1));

        schedule.add_unique_trainer(trainer_id);

        this.consume(Parser.TOKEN_LEFT_BRACE, "Expected '{' after trainer name.");

        while (!this.had_error && (this.current_token.kind !== Parser.TOKEN_RIGHT_BRACE))
        {
            let slot = schedule.append_time_slot(trainer_id);

            let can_be_fixed = false;

            if (this.current_token.kind == Parser.TOKEN_STRING)
            {
                this.consume(Parser.TOKEN_STRING, "Expected label for time slot.");
                slot.label = this.content.slice(this.previous_token.i0, this.previous_token.i1);

                can_be_fixed = true;
            }

            this.consume(Parser.TOKEN_LEFT_BRACKET, "Expected '['.");
            slot.min_time = this.parse_time("Expected earliest start time.");
            this.consume(Parser.TOKEN_MINUS, "Expected '-' between times.");
            slot.max_time = this.parse_time("Expected latest end time.");
            this.consume(Parser.TOKEN_RIGHT_BRACKET, "Expected ']' after times.");

            if (can_be_fixed && (this.current_token.kind == Parser.TOKEN_SEMICOLON))
            {
                slot.is_fixed = true;
                slot.duration = slot.max_time - slot.min_time;
            }
            else
            {
                slot.is_fixed = false;

                this.consume(Parser.TOKEN_STRING, "Expected name of gymnast as string.");
                slot.gymnast_id = schedule.get_person_index(this.content.slice(this.previous_token.i0, this.previous_token.i1));

                if (this.current_token.kind == Parser.TOKEN_LEFT_PAREN)
                {
                    this.advance();

                    while (!this.had_error && (this.current_token.kind != Parser.TOKEN_RIGHT_PAREN))
                    {
                        this.consume(Parser.TOKEN_STRING, "Expected name for gymnastic equipment.");
                        slot.add_gymnastic_equipment(schedule.get_gymnastic_equipment_index(
                            this.content.slice(this.previous_token.i0, this.previous_token.i1)));

                        if (this.current_token.kind == Parser.TOKEN_COMMA)
                        {
                            this.consume(Parser.TOKEN_COMMA, "Expected ','.");
                        }
                    }

                    this.consume(Parser.TOKEN_RIGHT_PAREN, "Expected ')'.");
                }
                else
                {
                    this.consume(Parser.TOKEN_STRING, "Expected name for gymnastic equipment.");
                    slot.add_gymnastic_equipment(schedule.get_gymnastic_equipment_index(
                        this.content.slice(this.previous_token.i0, this.previous_token.i1)));
                }

                slot.duration = this.parse_number("Expected time slot duration.");
            }

            this.consume(Parser.TOKEN_SEMICOLON, "Expected ';' at the end of a line.");
        }

        this.consume(Parser.TOKEN_RIGHT_BRACE, "Expected '}'.");
    }

    parse()
    {
        let schedule = new Schedule();

        this.advance();

        while (!this.had_error && (this.current_token.kind !== Parser.TOKEN_END_OF_INPUT))
        {
            this.advance();

            switch (this.previous_token.kind)
            {
                case Parser.TOKEN_DISTANCE:
                {
                    this.parse_distance(schedule);
                } break;

                case Parser.TOKEN_STRING:
                {
                    this.parse_trainer(schedule);
                } break;

                default:
                {
                    this.report_error("Unexpected token: " + this.previous_token.kind.toString(), this.previous_token.l0, this.previous_token.c0);
                } break;
            }
        }

        if (!this.had_error)
        {
            schedule.finalize();
        }
        else
        {
            schedule = null;
        }

        return schedule;
    }
};

(function (document) {
    "use strict";

    const CANVAS_OFFSET_X       = 150;
    const CANVAS_OFFSET_Y       = 14;

    const PIXEL_PER_MINUTE      = 8;
    const TIME_SLOT_PAD_TOP     = 4;
    const TIME_SLOT_PAD_RIGHT   = 5;
    const TIME_SLOT_PAD_LEFT    = 2;

    const TIME_HELPER_PAD_TOP   = 2;
    const TIME_HELPER_PAD_RIGHT = 3;
    const TIME_HELPER_PAD_LEFT  = 0;

    var drag_offset = 0;
    var drag_target = null;
    var drag_instance = null;
    var drag_time_slot = null;
    var drag_pointer_id = null;
    var drag_changed_time_slot = false;

    var file_picker = null;

    var canvas = null;
    var time_helper = null;

    var schedule = null;
    var instances = [];

    var main_worker_thread = null;

    var changeText = function (elem, text) {
        while (elem.hasChildNodes()) elem.removeChild(elem.firstChild);
        elem.appendChild(document.createTextNode(text));
    };

    var hide_time_helper = function () {
        time_helper.removeAttribute("style");
    };

    var show_time_helper = function (time_slot) {
        let trainer_index = schedule.trainers.indexOf(time_slot.trainer_id);

        let time_helper_offset_x = (time_slot.min_time - schedule.min_time) * PIXEL_PER_MINUTE + CANVAS_OFFSET_X + TIME_HELPER_PAD_LEFT;
        let time_helper_offset_y = (trainer_index * 60) + CANVAS_OFFSET_Y + TIME_HELPER_PAD_TOP;
        let time_helper_width    = (time_slot.max_time - time_slot.min_time) * PIXEL_PER_MINUTE - (TIME_HELPER_PAD_LEFT + TIME_HELPER_PAD_RIGHT);

        time_helper.style.display = "block";
        time_helper.style.top = time_helper_offset_y + "px";
        time_helper.style.left = time_helper_offset_x + "px";
        time_helper.style.width = time_helper_width + "px";
    };

    var update_collisions = function () {
        for (let instance_index = 0; instance_index < instances.length; instance_index += 1)
        {
            let current_instance = instances[instance_index];
            let current_time_slot = schedule.time_slots[current_instance.slot_id];

            let time_slot_item = document.getElementById("timeslot-" + current_instance.slot_id);

            let has_collision = false;

            for (let index = 0; index < instances.length; index += 1)
            {
                if (index !== instance_index)
                {
                    let instance = instances[index];
                    let time_slot = schedule.time_slots[instance.slot_id];

                    if (schedule.do_collide(current_time_slot, current_instance, time_slot, instance))
                    {
                        has_collision = true;
                        break;
                    }
                }
            }

            if (has_collision)
            {
                time_slot_item.classList.add("collision");
            }
            else
            {
                time_slot_item.classList.remove("collision");
            }
        }
    };

    var on_instances_changed = function () {
    };

    var pointer_move = function (ev) {
        if (ev.pointerId === drag_pointer_id)
        {
            let canvas_bounding_rect = canvas.getBoundingClientRect();
            let left = ev.clientX - canvas_bounding_rect.left - drag_offset;
            let pixel_offset = left - CANVAS_OFFSET_X - TIME_SLOT_PAD_LEFT;

            let time = (pixel_offset / PIXEL_PER_MINUTE) + schedule.min_time;

            if (true /* snap_to_five_minute */)
            {
                time = Math.round(time / 5) * 5;
            }

            time = Math.max(drag_time_slot.min_time, Math.min(time, drag_time_slot.max_time - drag_time_slot.duration));

            if (time !== drag_instance.start_time)
            {
                drag_instance.start_time = time;
                drag_instance.end_time = drag_instance.start_time + drag_time_slot.duration;

                let offset_x = ((time - schedule.min_time) * PIXEL_PER_MINUTE) + CANVAS_OFFSET_X + TIME_SLOT_PAD_LEFT;
                drag_target.style.left = offset_x + "px";

                update_collisions();
                drag_changed_time_slot = true;
            }
        }
    };

    var pointer_end = function (ev) {
        if (ev.pointerId === drag_pointer_id)
        {
            drag_target.removeEventListener("pointermove", pointer_move);
            drag_target.removeEventListener("pointerup", pointer_end);
            drag_target.removeEventListener("pointercancel", pointer_end);

            drag_target = null;
            drag_instance = null;
            drag_time_slot = null;
            drag_pointer_id = null;

            hide_time_helper();

            document.body.style.cursor = "default";

            if (drag_changed_time_slot)
            {
                on_instances_changed();
            }
        }
    };

    var pointer_begin = function (ev) {
        if (!ev.isPrimary) return;

        let elem = ev.currentTarget;
        let data_id = elem.getAttribute("data-id");
        let instance_index = Number(data_id);

        if (elem.classList.contains("timeslot") && (data_id !== null) &&
            !isNaN(instance_index) && (instance_index >= 0) &&
            (instance_index < instances.length))
        {
            ev.preventDefault();

            drag_target = elem;
            drag_instance = instances[instance_index];
            drag_time_slot = schedule.time_slots[drag_instance.slot_id];
            drag_pointer_id = ev.pointerId;
            drag_changed_time_slot = false;

            if (!drag_time_slot.is_fixed)
            {
                show_time_helper(drag_time_slot);
            }

            let canvas_bounding_rect = canvas.getBoundingClientRect();

            drag_offset = ev.clientX - (drag_target.offsetLeft + canvas_bounding_rect.left);

            drag_target.setPointerCapture(drag_pointer_id);

            drag_target.addEventListener("pointermove", pointer_move);
            drag_target.addEventListener("pointerup", pointer_end);
            drag_target.addEventListener("pointercancel", pointer_end);

            document.body.style.cursor = "move";
        }
    };

    var build_solving_status = function () {
        let timeline = document.getElementById("timeline");

        while (timeline.hasChildNodes()) timeline.removeChild(timeline.firstChild);
    };

    var build_schedule_timeline = function () {
        let timeline = document.getElementById("timeline");

        while (timeline.hasChildNodes()) timeline.removeChild(timeline.firstChild);

        let start_5_minute = Math.floor(schedule.min_time / 5);
        let end_5_minute = Math.ceil(schedule.max_time / 5);

        let timestamps = document.createElement("div");
        timestamps.setAttribute("id", "timestamps");

        for (let step = start_5_minute; step <= end_5_minute; step += 1)
        {
            let time = step * 5;
            let hour = Math.floor(time / 60);
            let minute = time % 60;

            let timecode = document.createElement("span");
            if (minute === 0)
            {
                timecode.appendChild(document.createTextNode(hour + ":00"));
                timecode.classList.add("fullhour");
            }
            else
            {
                timecode.appendChild(document.createTextNode(("0" + minute).slice(-2)));
            }
            timestamps.appendChild(timecode);
        }

        timeline.appendChild(timestamps);

        canvas = document.createElement("div");
        canvas.setAttribute("id", "timeline_canvas");

        let timeline_rows = document.createElement("div");

        let table_row = document.createElement("div");
        table_row.classList.add("head_row");

        let head_trainer = document.createElement("div");
        head_trainer.classList.add("head_trainer");

        table_row.appendChild(head_trainer);

        for (let step = start_5_minute; step < end_5_minute; step += 1)
        {
            let head_cell = document.createElement("div");
            head_cell.classList.add("head_cell");
            table_row.appendChild(head_cell);
        }

        timeline_rows.appendChild(table_row);

        for (let trainer_index = 0; trainer_index < schedule.trainers.length; trainer_index += 1)
        {
            let trainer_id = schedule.trainers[trainer_index];

            let table_row = document.createElement("div");
            table_row.classList.add("row");

            let trainer_name = document.createElement("div");

            trainer_name.classList.add("trainer_name");
            trainer_name.appendChild(document.createTextNode(schedule.people[trainer_id]));

            table_row.appendChild(trainer_name);

            for (let step = start_5_minute; step < end_5_minute; step += 1)
            {
                let cell = document.createElement("div");
                cell.classList.add("cell");
                table_row.appendChild(cell);
            }

            timeline_rows.appendChild(table_row);
        }

        canvas.appendChild(timeline_rows);

        time_helper = document.createElement("div");
        time_helper.classList.add("time_helper");

        canvas.appendChild(time_helper);

        for (let trainer_index = 0; trainer_index < schedule.trainers.length; trainer_index += 1)
        {
            let trainer_id = schedule.trainers[trainer_index];

            let offset_y = (trainer_index * 60) + CANVAS_OFFSET_Y + TIME_SLOT_PAD_TOP;

            for (let instance_index = 0; instance_index < instances.length; instance_index += 1)
            {
                let instance = instances[instance_index];
                let time_slot = schedule.time_slots[instance.slot_id];

                if (time_slot.trainer_id === trainer_id)
                {
                    let offset_x = (instance.start_time - schedule.min_time) * PIXEL_PER_MINUTE + CANVAS_OFFSET_X + TIME_SLOT_PAD_LEFT;
                    let time_slot_width = ((instance.end_time - instance.start_time) * PIXEL_PER_MINUTE) - (TIME_SLOT_PAD_LEFT + TIME_SLOT_PAD_RIGHT);

                    let timeslot = document.createElement("div");
                    timeslot.setAttribute("id", "timeslot-" + instance.slot_id);
                    timeslot.setAttribute("data-id", String(instance_index));
                    timeslot.classList.add("timeslot");

                    if (time_slot.is_fixed)
                    {
                        let label_item = document.createElement("div");
                        label_item.appendChild(document.createTextNode(time_slot.label));
                        label_item.classList.add("fixed");

                        timeslot.appendChild(label_item);
                    }
                    else
                    {
                        let name_item = document.createElement("div");
                        name_item.appendChild(document.createTextNode(schedule.people[time_slot.gymnast_id]));

                        timeslot.appendChild(name_item);

                        if (time_slot.label.length)
                        {
                            name_item.classList.add("name");

                            let label_item = document.createElement("div");
                            label_item.appendChild(document.createTextNode(time_slot.label));
                            label_item.classList.add("label");

                            timeslot.appendChild(label_item);
                        }
                        else
                        {
                            name_item.classList.add("soloname");
                        }

                        let gymnastic_equipment_id = time_slot.gymnastic_equipments[instance.gymnastic_equipment_index];

                        let gymnastic_equipment_item = document.createElement("div");
                        gymnastic_equipment_item.appendChild(document.createTextNode(schedule.gymnastic_equipments[gymnastic_equipment_id]));
                        gymnastic_equipment_item.classList.add("equipment");

                        let color_index = gymnastic_equipment_id % GYMNASTIC_EQUIPMENT_COLORS.length;

                        gymnastic_equipment_item.style.color = GYMNASTIC_EQUIPMENT_COLORS[color_index].foreground;
                        gymnastic_equipment_item.style.background = GYMNASTIC_EQUIPMENT_COLORS[color_index].background;

                        timeslot.appendChild(gymnastic_equipment_item);
                    }

                    timeslot.style.left  = offset_x + "px";
                    timeslot.style.top   = offset_y + "px";
                    timeslot.style.width = time_slot_width + "px";

                    timeslot.addEventListener("pointerdown", pointer_begin);
                    timeslot.ondragstart = () => false;

                    canvas.appendChild(timeslot);
                }
            }
        }

        timeline.appendChild(canvas);

        update_collisions();
    };

    var run_quick_check = function (sched) {
        let instances = [];

        for (let trainer_index = 0; trainer_index < sched.trainers.length; trainer_index += 1)
        {
            let trainer_id = schedule.trainers[trainer_index];
            let backtracking = new Backtracking(sched);

            for (let time_slot_index = 0; time_slot_index < sched.time_slots.length; time_slot_index += 1)
            {
                let time_slot = sched.time_slots[time_slot_index];

                if (time_slot.trainer_id === trainer_id)
                {
                    let instance = new TimeSlotInstance();

                    instance.slot_id = time_slot_index;
                    instance.gymnastic_equipment_index = U16MAX;
                    instance.start_time = U16MAX;
                    instance.end_time = U16MAX;

                    backtracking.slot_instances.push(instance);
                }
            }

            while ((backtracking.slot_index >= 0) && (backtracking.slot_index < backtracking.slot_instances.length))
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
            }

            if (backtracking.slot_index == backtracking.slot_instances.length)
            {
                for (let instance_index = 0; instance_index < backtracking.slot_instances.length; instance_index += 1)
                {
                    instances.push(backtracking.slot_instances[instance_index]);
                }
            }
            else
            {
                // TODO: highlight or mark the trainer row
                console.error("no solution for trainer " + trainer_id);
            }
        }

        return instances;
    };

    var load_plan = function (str) {
        let parser = new Parser(str);
        let new_schedule = parser.parse();

        if (new_schedule !== null)
        {
            schedule = new_schedule;
            instances = run_quick_check(schedule);

            build_schedule_timeline();
            on_instances_changed();
        }
    };

    var on_file_selected = function () {
        let blob = file_picker.files[0];
        blob.text().then(str => load_plan(str));
    };

    var open_file = function () {
        file_picker.click();
    };

    var save_file_content = function (filename, mimetype, content) {
        let blob = new Blob([ content ], { type: mimetype });

        let a = document.createElement("a");
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
    };

    var save_file = function () {
        if (schedule !== null)
        {
            save_file_content("plan.txt", "plain/txt", schedule.to_string(true));
        }
    };

    var export_pdf = function () {
    };

    var cancel_solving = function () {
        main_worker_thread.postMessage({ cmd: "cancel_solving" });

        let start_solving_button = document.getElementById("start_solving");

        start_solving_button.removeEventListener("click", cancel_solving);
        start_solving_button.addEventListener("click", start_solving);

        changeText(start_solving_button, "Solve");

        build_schedule_timeline();
    };

    var start_solving = function () {
        if (schedule)
        {
            let start_solving_button = document.getElementById("start_solving");

            start_solving_button.removeEventListener("click", start_solving);
            start_solving_button.addEventListener("click", cancel_solving);

            changeText(start_solving_button, "Abort");

            build_solving_status();
            main_worker_thread.postMessage({ cmd: "start_solving", schedule: schedule });
        }
    };

    var handle_main_worker_thread_message = function (message) {
        switch (message.data.cmd)
        {
            case "found_solution":
            {
                let solution_instances = message.data.instances;

                if (instances.length === solution_instances.length)
                {
                    for (let i = 0; i < solution_instances.length; i += 1)
                    {
                        for (let j = 0; j < instances.length; j += 1)
                        {
                            if (solution_instances[i].slot_id === instances[j].slot_id)
                            {
                                instances[j].gymnastic_equipment_index = solution_instances[i].gymnastic_equipment_index;
                                instances[j].start_time = solution_instances[i].start_time;
                                instances[j].end_time = solution_instances[i].end_time;
                                break;
                            }
                        }
                    }
                }

                let start_solving_button = document.getElementById("start_solving");

                start_solving_button.removeEventListener("click", cancel_solving);
                start_solving_button.addEventListener("click", start_solving);

                changeText(start_solving_button, "Solve");

                build_schedule_timeline();
                on_instances_changed();
            } break;

            case "no_solution":
            {
                let start_solving_button = document.getElementById("start_solving");

                start_solving_button.removeEventListener("click", cancel_solving);
                start_solving_button.addEventListener("click", start_solving);

                changeText(start_solving_button, "Solve");

                build_schedule_timeline();

                // TODO: show message, that there is no solution
            } break;
        }
    };

    var init = function () {
        file_picker = document.createElement("input");
        file_picker.type = "file";
        file_picker.addEventListener("change", on_file_selected);

        document.getElementById("open_file").addEventListener("click", open_file);
        document.getElementById("save_file").addEventListener("click", save_file);
        document.getElementById("export_pdf").addEventListener("click", export_pdf);
        document.getElementById("start_solving").addEventListener("click", start_solving);

        main_worker_thread = new Worker("main_worker_thread.js");
        main_worker_thread.addEventListener("message", handle_main_worker_thread_message);
    };

    document.addEventListener("DOMContentLoaded", init);

})(document);
