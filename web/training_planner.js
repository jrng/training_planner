const GYMNASTIC_EQUIPMENT_COLORS = [
    { background: [  81 / 255,  84 / 255, 112 / 255 ], foreground: [  28 / 255,  29 / 255,  39 / 255 ] },
    { background: [ 101 / 255,  79 / 255, 109 / 255 ], foreground: [  35 / 255,  28 / 255,  38 / 255 ] },
    { background: [ 132 / 255,  57 / 255,  57 / 255 ], foreground: [  75 / 255,  22 / 255,  22 / 255 ] },
    { background: [ 177 / 255, 118 / 255,  78 / 255 ], foreground: [ 119 / 255,  59 / 255,  19 / 255 ] },
    { background: [ 154 / 255, 156 / 255,  38 / 255 ], foreground: [  66 / 255,  67 / 255,  30 / 255 ] },
    { background: [  77 / 255, 141 / 255,  73 / 255 ], foreground: [  34 / 255,  65 / 255,  32 / 255 ] },
    { background: [  86 / 255, 118 / 255, 116 / 255 ], foreground: [  31 / 255,  46 / 255,  44 / 255 ] },
    { background: [ 210 / 255, 187 / 255,  55 / 255 ], foreground: [ 126 / 255, 112 / 255,  38 / 255 ] },
    { background: [ 185 / 255, 116 / 255, 182 / 255 ], foreground: [ 117 / 255,  47 / 255, 113 / 255 ] },
    { background: [ 136 / 255,  95 / 255,  68 / 255 ], foreground: [  89 / 255,  56 / 255,  34 / 255 ] },
    { background: [ 181 / 255, 181 / 255, 181 / 255 ], foreground: [  66 / 255,  67 / 255,  77 / 255 ] },
    { background: [ 210 / 255, 101 / 255, 108 / 255 ], foreground: [ 164 / 255,  45 / 255,  55 / 255 ] },
    { background: [  80 / 255, 178 / 255, 180 / 255 ], foreground: [  34 / 255,  97 / 255,  98 / 255 ] },
    { background: [  26 / 255,  35 / 255,  46 / 255 ], foreground: [ 186 / 255, 200 / 255, 216 / 255 ] },
    { background: [  91 / 255, 134 / 255, 174 / 255 ], foreground: [  31 / 255,  66 / 255,  97 / 255 ] },
    { background: [ 147 / 255, 152 / 255, 204 / 255 ], foreground: [  36 / 255,  44 / 255, 117 / 255 ] },
];

class StringBuilder
{
    constructor(size)
    {
        this.index = 0;
        this.encoder = new TextEncoder();
        this.output = new Uint8Array(size);
    }

    append(str)
    {
        this.index += this.encoder.encodeInto(str, this.output.subarray(this.index)).written;
    }

    append_utf16be(str)
    {
        this.output[this.index++] = 254;
        this.output[this.index++] = 255;

        for (let elem of str)
        {
            let codepoint = elem.codePointAt(0);

            if ((codepoint < 0xd800) || ((codepoint >= 0xe000) && (codepoint < 0x1000)))
            {
                this.output[this.index + 0] = ((codepoint >> 8) & 0xff);
                this.output[this.index + 1] = ( codepoint       & 0xff);
                this.index += 2;
            }
            else if ((codepoint >= 0x10000) && (codepoint < 0x110000))
            {
                codepoint -= 0x10000;
                let leading  = 0xd800 | ((codepoint >> 10) & 0x3ff);
                let trailing = 0xdc00 | ( codepoint        & 0x3ff);

                this.output[this.index + 0] = (u8) ((leading >> 8) & 0xff);
                this.output[this.index + 1] = (u8) ( leading       & 0xff);
                this.output[this.index + 2] = (u8) ((trailing >> 8) & 0xff);
                this.output[this.index + 3] = (u8) ( trailing       & 0xff);
                this.index += 4;
            }
        }
    }

    append_string_builder(builder)
    {
        let i = this.index;
        let size = builder.index;

        for (let j = 0; j < size; j += 1, i += 1)
        {
            this.output[i] = builder.output[j];
        }

        this.index += size;
    }

    finalize()
    {
        return this.output.slice(0, this.index);
    }
};

class PDFExporter
{
    static MAX_FILE_SIZE = 4 * 1024 * 1024;

    constructor()
    {
        this.root_id = 0;
        this.info_id = 0;
        this.next_object_id = 1;
        this.object_offsets = [];
        this.string_builder = new StringBuilder(PDFExporter.MAX_FILE_SIZE);

        this.append("%PDF-1.5\n%\xD0\xD4\xC5\xD8\n");
    }

    append(str)
    {
        this.string_builder.append(str);
    }

    append_utf16be(str)
    {
        this.string_builder.append_utf16be(str);
    }

    append_string_builder(builder)
    {
        this.string_builder.append_string_builder(builder);
    }

    create_object()
    {
        let object_id = this.next_object_id;
        this.next_object_id += 1;
        this.object_offsets.push(this.string_builder.index);

        return object_id;
    }

    finalize()
    {
        let startxref = this.index;

        this.append("xref\n");
        this.append("0 " + this.next_object_id + "\n");
        this.append("0000000000 65535 f\n");

        for (let i = 0; i < this.object_offsets.length; i += 1)
        {
            this.append(("000000000" + this.object_offsets[i]).slice(-10) + " 00000 n\n");
        }

        this.append("trailer\n");
        this.append("<< /Size " + this.next_object_id + " /Root " + this.root_id + " 0 R /Info " + this.info_id + " 0 R >>\n");
        this.append("startxref\n");
        this.append(startxref + "\n");
        this.append("%%EOF\n");

        return this.string_builder.finalize()
    }
};

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

    var number_of_placements = null;

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

        let container = document.createElement("div");
        container.classList.add("solving_status");

        let heading = document.createElement("h1");
        heading.appendChild(document.createTextNode("Solving status"));

        container.appendChild(heading);

        let backtracking = document.createElement("h2");
        backtracking.appendChild(document.createTextNode("Backtracking"));

        container.appendChild(backtracking);

        let backtracking_state = document.createElement("p");

        number_of_placements = document.createElement("span");
        number_of_placements.appendChild(document.createTextNode("0"));

        backtracking_state.appendChild(number_of_placements);
        backtracking_state.appendChild(document.createTextNode(" / " + schedule.time_slots.length + " time slots were successfully placed."));

        container.appendChild(backtracking_state);

        let abort_button = document.createElement("button");
        abort_button.appendChild(document.createTextNode("Abort"));
        abort_button.classList.add("fill_button");

        abort_button.addEventListener("click", cancel_solving);

        container.appendChild(abort_button);

        timeline.appendChild(container);
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

                        let fg = GYMNASTIC_EQUIPMENT_COLORS[color_index].foreground;
                        let bg = GYMNASTIC_EQUIPMENT_COLORS[color_index].background;

                        gymnastic_equipment_item.style.color      = "rgb(" + (fg[0] * 100) + "%, " + (fg[1] * 100) + "%, " + (fg[2] * 100) + "%)";
                        gymnastic_equipment_item.style.background = "rgb(" + (bg[0] * 100) + "%, " + (bg[1] * 100) + "%, " + (bg[2] * 100) + "%)";

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

    var cut_rounded_rect = function(builder, x0, y0, x1, y1, radius, page_width, page_height) {
        let x0r = x0 + radius;
        let x1r = x1 - radius;
        let y0r = y0 + radius;
        let y1r = y1 - radius;

        let c = radius * 0.551915024494;

        let x0c = x0r - c;
        let x1c = x1r + c;
        let y0c = y0r - c;
        let y1c = y1r + c;

        builder.append("0.0 0.0 " + page_width + " " + page_height + " re");
        builder.append(" " + x0r + " " + y0 + " m " + x1r + " " + y0 + " l " + x1c + " " + y0 + " " + x1 + " " + y0c + " " + x1 + " " + y0r + " c");
        builder.append(" " + x1 + " " + y1r + " l " + x1 + " " + y1c + " " + x1c + " " + y1 + " " + x1r + " " + y1 + " c");
        builder.append(" " + x0r + " " + y1 + " l " + x0c + " " + y1 + " " + x0 + " " + y1c + " " + x0 + " " + y1r + " c");
        builder.append(" " + x0 + " " + y0r + " l " + x0 + " " + y0c + " " + x0c + " " + y0 + " " + x0r + " " + y0 + " c W* n\n");
    };

    var stroke_rounded_rect = function(builder, x0, y0, x1, y1, stroke_width, radius)
    {
        let x0r = x0 + radius;
        let x1r = x1 - radius;
        let y0r = y0 + radius;
        let y1r = y1 - radius;

        let c = radius * 0.551915024494;

        let x0c = x0r - c;
        let x1c = x1r + c;
        let y0c = y0r - c;
        let y1c = y1r + c;

        builder.append(stroke_width + " w 0.4 0.4 0.4 RG");
        builder.append(" " + x0r + " " + y0 + " m " + x1r + " " + y0 + " l " + x1c + " " + y0 + " " + x1 + " " + y0c + " " + x1 + " " + y0r + " c");
        builder.append(" " + x1 + " " + y1r + " l " + x1 + " " + y1c + " " + x1c + " " + y1 + " " + x1r + " " + y1 + " c");
        builder.append(" " + x0r + " " + y1 + " l " + x0c + " " + y1 + " " + x0 + " " + y1c + " " + x0 + " " + y1r + " c");
        builder.append(" " + x0 + " " + y0r + " l " + x0 + " " + y0c + " " + x0c + " " + y0 + " " + x0r + " " + y0 + " c S\n");
    }

    var generate_pdf = function () {
        let pdf = new PDFExporter();

        pdf.info_id = pdf.create_object();

        pdf.append(pdf.info_id + " 0 obj\n");
        pdf.append("<< /Title (");
        pdf.append_utf16be("Training Plan");
        pdf.append(")\n");
        pdf.append("   /Producer (");
        pdf.append_utf16be("Training Planner (Made with ☕)");
        pdf.append(")\n");
        pdf.append(">>\nendobj\n");

        let resource_id = pdf.create_object();

        pdf.append(resource_id + " 0 obj\n");
        pdf.append("<< /Font << /F1 " + (resource_id + 1) + " 0 R >>\n");
        pdf.append(">>\nendobj\n");

        let font_id = pdf.create_object();

        pdf.append(font_id + " 0 obj\n");
        pdf.append("<< /Type /Font\n");
        pdf.append("   /Subtype /Type1\n");
        pdf.append("   /BaseFont /Helvetica\n");
        pdf.append(">>\nendobj\n");

        pdf.root_id = pdf.create_object();

        pdf.append(pdf.root_id + " 0 obj\n");
        pdf.append("<< /Type /Catalog\n");
        pdf.append("   /Pages " + (pdf.root_id + 1) + " 0 R\n");
        pdf.append(">>\nendobj\n");

        let pages_id = pdf.create_object();

        pdf.append(pages_id + " 0 obj\n");
        pdf.append("<< /Type /Pages\n");
        pdf.append("   /Kids [" + (pages_id + 1) + " 0 R]\n");
        pdf.append("   /Count 1\n");
        pdf.append(">>\nendobj\n");

        let page_id = pdf.create_object();

        pdf.append(page_id + " 0 obj\n");
        pdf.append("<< /Type /Page\n");
        pdf.append("   /Parent " + pages_id + " 0 R\n");
        pdf.append("   /Contents " + (page_id + 1) + " 0 R\n");
        pdf.append("   /Resources " + resource_id + " 0 R\n");
        pdf.append("   /MediaBox [0 0 841.8897638 595.2755906]\n");
        pdf.append(">>\nendobj\n");

        let cvs = document.createElement("canvas");
        let ctx = cvs.getContext("2d");

        let units_per_cm = 28.3464576;

        let width  = 841.8897638;
        let height = 595.2755906;

        let padding_in_cm = 2;
        let padding    = padding_in_cm * units_per_cm;
        let pad_top    = padding;
        let pad_right  = padding;
        let pad_bottom = padding;
        let pad_left   = 2.5 * padding;

        let row_height = 30;
        let row_distance = 6;

        let content_width = width - (pad_left + pad_right);

        let start_5_minute = Math.floor(schedule.min_time / 5);
        let end_5_minute = Math.ceil(schedule.max_time / 5);

        let units_per_minute = content_width / (5 * (end_5_minute - start_5_minute));

        let stream = new StringBuilder(PDFExporter.MAX_FILE_SIZE);

        let row_index = 0;

        stream.append("q\n");

        for (let trainer_index = 0; trainer_index < schedule.trainers.length; trainer_index += 1)
        {
            let trainer_id = schedule.trainers[trainer_index];

            row_index += 1;

            for (let instance_index = 0; instance_index < instances.length; instance_index += 1)
            {
                let instance = instances[instance_index];
                let time_slot = schedule.time_slots[instance.slot_id];

                if (time_slot.trainer_id === trainer_id)
                {
                    let x = pad_left + (instance.start_time - schedule.min_time) * units_per_minute;
                    let y = height - (pad_top + row_index * (row_height + row_distance) + 0.5 * row_distance);

                    let w = (instance.end_time - instance.start_time) * units_per_minute;

                    cut_rounded_rect(stream, x + 1, y, x + w - 1, y + row_height, 2, width, height);
                }
            }
        }

        for (let step = start_5_minute; step <= end_5_minute; step += 1)
        {
            let time = step * 5;

            let x = pad_left + ((step - start_5_minute) * 5 * units_per_minute);
            let y1 = Math.max(pad_bottom, height - (pad_top + (schedule.trainers.length * (row_height + row_distance)) + row_distance));
            stream.append("0.5 w 0 J 0.6 0.6 0.6 RG " + x + " " + (height - pad_top) + " m " + x + " " + y1 + " l S\n");
            stream.append("0.4 0.4 0.4 rg BT /F1 7 Tf " + (x - 9) + " " + (height - pad_top + 4) + " Td (" + TimeSlot.time_to_string(time) + ")Tj ET\n");
        }

        stream.append("Q\n");

        stream.append("0.5 w 0 J 0.6 0.6 0.6 RG " + padding + " " + (height - pad_top - row_distance) + " m " +
                      (width - pad_right) + " " + (height - pad_top - row_distance) + " l S\n");

        row_index = 0;

        for (let trainer_index = 0; trainer_index < schedule.trainers.length; trainer_index += 1)
        {
            let trainer_id = schedule.trainers[trainer_index];
            let trainer_name = schedule.people[trainer_id];

            row_index += 1;

            let y = height - (pad_top + row_index * (row_height + row_distance));

            stream.append("0.1 0.1 0.1 rg BT /F1 9 Tf " + (padding + 8) + " " + (y + 0.4 * row_height - 0.5 * row_distance) + " Td (" + trainer_name + ")Tj ET\n");
            stream.append("0.5 w 0 J 0.6 0.6 0.6 RG " + padding + " " + (y - row_distance) + " m " + (width - pad_right) + " " + (y - row_distance) + " l S\n");

            for (let instance_index = 0; instance_index < instances.length; instance_index += 1)
            {
                let instance = instances[instance_index];
                let time_slot = schedule.time_slots[instance.slot_id];

                if (time_slot.trainer_id === trainer_id)
                {
                    let x = pad_left + (instance.start_time - schedule.min_time) * units_per_minute;
                    let y = height - (pad_top + row_index * (row_height + row_distance) + 0.5 * row_distance);

                    let w = (instance.end_time - instance.start_time) * units_per_minute;

                    stroke_rounded_rect(stream, x + 1, y, x + w - 1, y + row_height, 0.5, 2);

                    if (time_slot.is_fixed)
                    {
                        let label = time_slot.label;

                        let label_size = 7;

                        ctx.font = "normal " + (label_size * 0.75) + "pt Helvetica, sans-serif";
                        let label_width = ctx.measureText(label).width;

                        stream.append("0.6 0.6 0.6 rg BT /F1 " + label_size + " Tf " + (x + 0.5 * (w - label_width)) +
                                      " " + (y + 0.45 * row_height) + " Td (" + label + ")Tj ET\n");
                    }
                    else
                    {
                        let gymnastic_equipment_id = time_slot.gymnastic_equipments[instance.gymnastic_equipment_index];

                        let label = time_slot.label;
                        let gymnast_name = schedule.people[time_slot.gymnast_id];
                        let gymnastic_equipment_name = schedule.gymnastic_equipments[gymnastic_equipment_id];

                        let label_size = 7;
                        let name_size = 7;
                        let gymnastic_equipment_size = 6;

                        ctx.font = "normal " + (label_size * 0.75) + "pt Helvetica, sans-serif";
                        let label_width = ctx.measureText(label).width;

                        ctx.font = "normal " + (name_size * 0.75) + "pt Helvetica, sans-serif";
                        let name_width = ctx.measureText(gymnast_name).width;

                        ctx.font = "normal " + (gymnastic_equipment_size * 0.75) + "pt Helvetica, sans-serif";
                        let gymnastic_equipment_width = ctx.measureText(gymnastic_equipment_name).width;

                        let name_y = y + 0.56 * row_height;

                        if (label.length)
                        {
                            name_y = y + 0.73 * row_height;
                            stream.append("0.6 0.6 0.6 rg BT /F1 " + label_size + " Tf " + (x + 0.5 * (w - label_width)) +
                                          " " + (y + 0.45 * row_height) + " Td (" + label + ")Tj ET\n");
                        }

                        stream.append("0.2 0.2 0.2 rg BT /F1 " + name_size + " Tf " + (x + 0.5 * (w - name_width)) +
                                      " " + name_y + " Td (" + gymnast_name + ")Tj ET\n");

                        let color_index = gymnastic_equipment_id % GYMNASTIC_EQUIPMENT_COLORS.length;

                        let fg = GYMNASTIC_EQUIPMENT_COLORS[color_index].foreground;
                        let bg = GYMNASTIC_EQUIPMENT_COLORS[color_index].background;

                        {
                            let x0 = x + 1.75;
                            let y0 = y + 0.75;
                            let x1 = x + w - 1.75;
                            let y1 = y + 0.35 * row_height;

                            let radius = 1.5;

                            let x0r = x0 + radius;
                            let x1r = x1 - radius;
                            let y0r = y0 + radius;

                            let c = radius * 0.551915024494;

                            let x0c = x0r - c;
                            let x1c = x1r + c;
                            let y0c = y0r - c;

                            stream.append(bg[0] + " " + bg[1] + " " + bg[2] + " rg");
                            stream.append(" " + x0r + " " + y0 + " m " + x1r + " " + y0 + " l " + x1c + " " + y0 + " " + x1 + " " + y0c + " " + x1 + " " + y0r + " c");
                            stream.append(" " + x1 + " " + y1 + " l " + x0 + " " + y1 + " l");
                            stream.append(" " + x0 + " " + y0r + " l " + x0 + " " + y0c + " " + x0c + " " + y0 + " " + x0r + " " + y0 + " c f\n");
                        }

                        stream.append(fg[0] + " " + fg[1] + " " + fg[2] + " rg BT /F1 " + gymnastic_equipment_size + " Tf " +
                                      (x + 0.5 * (w - gymnastic_equipment_width)) + " " + (y + 0.12 * row_height) + " Td (" +
                                      gymnastic_equipment_name + ")Tj ET\n");
                    }
                }
            }
        }

        let content_id = pdf.create_object();

        pdf.append(content_id + " 0 obj\n");
        pdf.append("<< /Length " + stream.index + " >>\n");
        pdf.append("stream\n");
        pdf.append_string_builder(stream);
        pdf.append("endstream\nendobj\n");

        return pdf.finalize();
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

            document.getElementById("save_file").removeAttribute("disabled");
            document.getElementById("export_pdf").removeAttribute("disabled");
            document.getElementById("start_solving").removeAttribute("disabled");

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
            // TODO: change file name
            save_file_content("plan.txt", "plain/txt", schedule.to_string(true));
        }
    };

    var export_pdf = function () {
        if (schedule !== null)
        {
            // TODO: change file name
            save_file_content("plan.pdf", "application/pdf", generate_pdf());
        }
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

            case "solve_status":
            {
                changeText(number_of_placements, String(message.data.best_slot_count));
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
