//(function(window) {
// 'use strict';
import parse_src from "./parser.js";
import {
    addClass,
    removeClass,
    toggleClass,
    setStyle,
    prepareStyle,
    restoreStyle,
    getByClass,
    setText,
    addListener,
    toggleListener,
    cancelEvent,
    createElement,
    toggleDisplay,
    toggleAnimation,
    toggleVisibility,
    downloadImage

} from "./helper.js";


export function Spotlight(selector, options = {}) {
    // Instance properties
    this.controls = [
        "info",
        "theme",
        "download",
        "play",
        "page",
        "close",
        "autofit",
        "zoom-in",
        "zoom-out",
        "prev",
        "next",
        "fullscreen"
    ];
    this.controls_default = {
        "info": 1,
        "page": 1,
        "close": 1,
        "autofit": 1,
        "zoom-in": 1,
        "zoom-out": 1,
        "prev": 1,
        "next": 1,
        "fullscreen": 1
    };
    this.keycodes = {
        BACKSPACE: 8,
        ESCAPE: 27,
        SPACEBAR: 32,
        LEFT: 37,
        RIGHT: 39,
        UP: 38,
        NUMBLOCK_PLUS: 107,
        PLUS: 187,
        DOWN: 40,
        NUMBLOCK_MINUS: 109,
        MINUS: 189,
        INFO: 73
    };

    this.controls_dom = {};
    this.connection = navigator["connection"];
    this.dpr = window["devicePixelRatio"] || 1;

    this.widget = createElement("div");
    this.init(selector, options);
}

Spotlight.prototype.init = function(parentEl, options) {

    if (this.parentEl) {
        return;
    }

    this.doc = document.body;
    this.parentEl = parentEl || document.body;

    this.scale = 1;
    this.x = 0;
    this.y = 0;

    if (options) {
        this.options = options;
    }

    this.widget.innerHTML = (
        '<div class=spl-spinner></div>' +
            '<div class=spl-track>' +
                '<div class=spl-scene>' +
                    '<div class=spl-pane></div>' +
                '</div>' +
            '</div>' +
            '<div class=spl-header>' +
                '<div class=spl-page> </div>' +
            '</div>' +
            '<div class=spl-progress></div>' +
            '<div class=spl-footer>' +
                '<div class=spl-title> </div>' +
                '<div class=spl-more> </div>' +
                '<div class=spl-description> </div>' +
                '<div class=spl-button> </div>' +
            '</div>' +
            '<div class=spl-prev></div>' +
            '<div class=spl-next></div>'
    );

    this.widget.classList.add("spotlight");

    this.slider = this.getOneByClass("scene");
    this.header = this.getOneByClass("header");
    this.footer = this.getOneByClass("footer");
    this.title = this.getOneByClass("title");
    this.description = this.getOneByClass("description");
    this.button = this.getOneByClass("button");
    this.page_prev = this.getOneByClass("prev");
    this.page_next = this.getOneByClass("next");
    this.page = this.getOneByClass("page");
    this.progress = this.getOneByClass("progress");
    this.spinner = this.getOneByClass("spinner");
    this.panes = [this.getOneByClass("pane")];
    this.track = this.getOneByClass("track");

    this.addControl("close", this.close.bind(this));

    this.doc[this.prefix_request = "requestFullscreen"] ||
            this.doc[this.prefix_request = "msRequestFullscreen"] ||
            this.doc[this.prefix_request = "webkitRequestFullscreen"] ||
            this.doc[this.prefix_request = "mozRequestFullscreen"] ||
            (this.prefix_request = "");

    if (this.prefix_request) {
        this.prefix_exit = (
            this.prefix_request.replace("request", "exit")
                .replace("mozRequest", "mozCancel")
                .replace("Request", "Exit")
        );
        this.maximize = this.addControl("fullscreen", this.fullscreen.bind(this));
    } else {
        this.controls.pop();
    }

    this.addControl("info", this.info.bind(this));
    this.addControl("autofit", this.autofit.bind(this));
    this.addControl("zoom-in", this.zoom_in.bind(this));
    this.addControl("zoom-out", this.zoom_out.bind(this));
    this.addControl("theme", this.theme.bind(this));
    this.player = this.addControl("play", this.play.bind(this));
    this.addControl("download", this.download.bind(this));

    addListener(this.page_prev, "click", this.prev.bind(this));
    addListener(this.page_next, "click", this.next.bind(this));
    /*
    const track = this.getOneByClass("track");

    addListener(track, "mousedown", this.start.bind(this));
    addListener(track, "mousemove", this.move.bind(this));
    addListener(track, "mouseleave", this.end.bind(this));
    addListener(track, "mouseup", this.end.bind(this));

    addListener(track, "touchstart", this.start.bind(this), {passive: false});
    addListener(track, "touchmove", this.move.bind(this), {passive: true});
    addListener(track, "touchend", this.end.bind(this));
    */

    addListener(this.button, "click", () => {
        if (this.options_click) {
            this.options_click(this.current_slide, this.options);
        } else if (this.options_href) {
            location.href = this.options_href;
        }
    });
};

Spotlight.prototype.getOneByClass = function(classname) {
    return this.controls_dom[classname] = getByClass("spl-" + classname, this.widget)[0];
};

Spotlight.prototype.addControl = function(classname, fn) {
    const div = createElement("div");
    div.className = "spl-" + classname;
    addListener(div, "click", fn);
    this.header.appendChild(div);
    return this.controls_dom[classname] = div;
};

Spotlight.prototype.removeControl = function(classname) {
    const div = this.controls_dom[classname];
    if (div) {
        this.header.removeChild(div);
        this.controls_dom[classname] = null;
    }
};

Spotlight.prototype.dispatch = function(event) {
    const target = event.target.closest(".spotlight");
    if (target) {
        cancelEvent(event, true);
        const group = target.closest(".spotlight-group");
        this.anchors = getByClass("spotlight", group);
        // determine current selected index
        for (let i = 0; i < this.anchors.length; i++) {
            if (this.anchors[i] === target) {
                this.options_group = group && group.dataset;
                this.init_gallery(i + 1);
                break;
            }
        }
    }
};

Spotlight.prototype.show = function(gallery, group, index) {
    this.anchors = gallery;
    if (group) {
        this.options_group = group;
        this.options_onshow = group["onshow"];
        this.options_onchange = group["onchange"];
        this.options_onclose = group["onclose"];
        this.index = index || group["index"];
    }
    this.init_gallery(index);
};



Spotlight.prototype.init_gallery = function(index) {
    //console.log("init_gallery", index);
    this.slide_count = this.anchors.length;
    if (this.slide_count) {

        this.parentEl || this.init();

        this.options_onshow && this.options_onshow(index);
        const pane = this.panes[0];
        const parent = pane.parentNode;

        for (let i = this.panes.length; i < this.slide_count; i++) {
            const clone = pane.cloneNode(false);
            setStyle(clone, "left", (i * 100) + "%");
            parent.appendChild(clone);
            this.panes[i] = clone;
        }

        if (!this.panel) {
            this.parentEl.appendChild(this.widget);
            this.update_widget_viewport();
            //this.panel = this.widget;
            //this.resize_listener();
        }
        this.current_slide = index || 1;
        toggleAnimation(this.slider);
        this.setup_page(true);
        this.prefix_request && this.detect_fullscreen();
        this.show_gallery();
    }
};

Spotlight.prototype.parse_option = function(key, is_default) {
    //console.log("parse_option", key, is_default);
    let val = this.options[key];
    if (typeof val !== "undefined") {
        val = "" + val;
        return (val !== "false") && (val || is_default);
    }
    return is_default;
};

Spotlight.prototype.apply_options = function(anchor) {
    //console.log("apply_options", anchor);
    this.options = {};
    this.options_group && Object.assign(this.options, this.options_group);
    Object.assign(this.options, anchor.dataset || anchor);

    // TODO: theme is icon and option field!

    this.options_media = this.options["media"];
    this.options_click = this.options["onclick"];
    this.options_theme = this.options["theme"];
    this.options_class = this.options["class"];
    this.options_autohide = this.parse_option("autohide", true);
    this.options_infinite = this.parse_option("infinite");
    this.options_progress = this.parse_option("progress", true);
    this.options_autoslide = this.parse_option("autoslide");
    this.options_preload = this.parse_option("preload", true);
    this.options_href = this.options["buttonHref"];
    this.delay = (this.options_autoslide && parseFloat(this.options_autoslide)) || 7;
    this.toggle_theme || (this.options_theme && this.theme(this.options_theme));
    this.options_class && addClass(this.widget, this.options_class);
    this.options_class && prepareStyle(this.widget);

    const control = this.options["control"];

    // determine controls
    if (control) {
        const whitelist = (
            typeof control === "string" ? control.split(",") : control
        );
            // prepare to false when using whitelist
        for (let i = 0; i < this.controls.length; i++) {
            this.options[this.controls[i]] = false;
        }
        // apply whitelist
        for (let i = 0; i < whitelist.length; i++) {
            const option = whitelist[i].trim();
            // handle shorthand "zoom"
            if (option === "zoom") {
                this.options["zoom-in"] = this.options["zoom-out"] = true;
            } else {
                this.options[option] = true;
            }
        }
    }

    // determine animations
    const animation = this.options["animation"];
    this.animation_scale = this.animation_fade = this.animation_slide = !animation;
    this.animation_custom = false;

    if (animation) {
        const whitelist = (
            typeof animation === "string" ?
                animation.split(",") : animation
        );

        // apply whitelist
        for (let i = 0; i < whitelist.length; i++) {
            const option = whitelist[i].trim();
            if (option === "scale") {
                this.animation_scale = true;
            } else if (option === "fade") {
                this.animation_fade = true;
            } else if (option === "slide") {
                this.animation_slide = true;
            } else if (option) {
                this.animation_custom = option;
            }
        }
    }
    this.options_fit = this.options["fit"];
};

Spotlight.prototype.prepare_animation = function(prepare) {
    //console.log("prepare_animation", prepare);
    //console.log("this.media", this.media);
    //console.log("this.slider", this.slider);
    //console.log("this.animation_slide", this.animation_slide);

    if (prepare) {
        prepareStyle(this.media, this.prepare_animation);
    } else {
        //toggleAnimation(this.slider, this.animation_slide);
        setStyle(this.media, "opacity", this.animation_fade ? 0 : 1);
        this.update_scroll(this.animation_scale && 0.8);
        this.animation_custom && addClass(this.media, this.animation_custom);
    }
};

Spotlight.prototype.init_slide = function(index) {
    //console.log("init_slide", index);
    this.panel = this.panes[index - 1];
    this.media = (this.panel.firstChild);
    this.current_slide = index;

    if (this.media) {
        this.disable_autoresizer();
        if (this.options_fit) {
            addClass(this.media, this.options_fit);
        }
        //this.prepare_animation(true);
        this.animation_custom && removeClass(this.media, this.animation_custom);
        this.animation_fade && setStyle(this.media, "opacity", 1);
        this.animation_scale && setStyle(this.media, "transform", "");
        setStyle(this.media, "visibility", "visible");

        //this.gallery_next && (this.media_next.src = this.gallery_next);
        this.options_autoslide && this.animate_bar(this.playing);
    } else {

        const type = this.gallery.media;
        const options_spinner = this.parse_option("spinner", true);

        if (type === "node") {
            this.media = this.gallery.src;
            if (typeof this.media === "string") {
                this.media = document.querySelector(this.media);
            }

            if (this.media) {
                this.media._root || (this.media._root = this.media.parentNode);
                this.update_media_viewport();
                this.panel.appendChild(this.media);
                this.init_slide(index);
            }
            return;
        } else {
            this.toggle_spinner(options_spinner, true);
            this.media = (createElement("img"));
            this.media.onload = () => {
                //if (this.media === this) {
                this.media.onerror = null;
                this.toggle_spinner(options_spinner);
                this.init_slide(index);
                this.update_media_viewport();
                //}
            };
            //media.crossOrigin = "anonymous";
            this.media.src = this.gallery.src;
            this.panel.appendChild(this.media);
        }

        if (this.media) {
            options_spinner || setStyle(this.media, "visibility", "visible");
            this.media.onerror = () => {
                //if (this.media === this) {
                this.checkout(this.media);
                addClass(this.spinner, "error");
                this.toggle_spinner(options_spinner);
                //}
            };
        }
    }
};

Spotlight.prototype.toggle_spinner = function(options_spinner, is_on) {
    options_spinner && toggleClass(this.spinner, "spin", is_on);
};

Spotlight.prototype.has_fullscreen = function() {
    return (
        document["fullscreen"] ||
            document["fullscreenElement"] ||
            document["webkitFullscreenElement"] ||
            document["mozFullScreenElement"]
    );
};

Spotlight.prototype.resize_listener = function() {
    this.update_widget_viewport();
    this.media && this.update_media_viewport();
    if (this.prefix_request) {
        const is_fullscreen = this.has_fullscreen();
        toggleClass(this.maximize, "on", is_fullscreen);
        is_fullscreen || this.detect_fullscreen();
    }
    //update_scroll();
};

Spotlight.prototype.detect_fullscreen = function() {
    toggleDisplay(this.maximize, (screen.availHeight - window.innerHeight) > 0);
};

Spotlight.prototype.update_widget_viewport = function() {
    this.viewport_w = this.widget.clientWidth;
    this.viewport_h = this.widget.clientHeight;
};

Spotlight.prototype.update_media_viewport = function() {
    this.media_w = this.media.clientWidth;
    this.media_h = this.media.clientHeight;
};

Spotlight.prototype.update_scroll = function(force_scale) {
    setStyle(this.media, "transform", "translate(-50%, -50%) scale(" + (force_scale || this.scale) + ")");
};

Spotlight.prototype.update_panel = function(x, y) {
    setStyle(this.panel, "transform", x || y ? "translate(" + x + "px, " + y + "px)" : "");
};

Spotlight.prototype.update_slider = function(index, prepare, offset) {
    if (prepare) {
        prepareStyle(this.slider, () => {
            this.update_slider(index, false, offset);
        });
    } else {
        setStyle(this.slider, "transform", "translateX(" + (-index * 100 + (offset || 0)) + "%)");
    }
};

Spotlight.prototype.toggle_listener_track = function(state) {
    const node = this.track;
    window.activeElement = node;

    toggleListener(state, node, "wheel", this.wheel_listener.bind(this), {passive: false});
    toggleListener(state, node, "mousedown", this.start.bind(this));
    toggleListener(state, node, "mousemove", this.move.bind(this));
    toggleListener(state, node, "mouseleave", this.end.bind(this));
    toggleListener(state, node, "mouseup", this.end.bind(this));
    toggleListener(state, node, "touchstart", this.start.bind(this), {passive: false});
    toggleListener(state, node, "touchmove", this.move.bind(this), {passive: true});
    toggleListener(state, node, "touchend", this.end.bind(this));
    toggleListener(state, node, "resize", this.resize_listener.bind(this));
};


Spotlight.prototype.toggle_listener_widget = function(state) {
    const node = this.parentEl;
    toggleListener(state, node, "resize", this.resize_listener.bind(this));
    this.toggle_listener_track(state);
};

Spotlight.prototype.toggle_listener = function(state) {
    //console.log("toggle_listener", install);
    toggleListener(state, window, "keydown", this.key_listener.bind(this));
    //toggleListener(state, window, "popstate", this.history_listener.bind(this));
    this.toggle_listener_widget(state);
};

Spotlight.prototype.history_listener = function(event) {
    //console.log("history_listener");
    if (this.panel && event.state["spl"]) {
        this.close(true);
    }
};

Spotlight.prototype.key_listener = function(event) {
    //console.log("key_listener");
    //if (this.panel) {
    if (this.panel && window.activeElement && window.activeElement === this.track) {
        const zoom_enabled = this.options["zoom-in"] !== false;
        switch (event.keyCode) {
        case this.keycodes.BACKSPACE:
            zoom_enabled && this.autofit();
            break;
        case this.keycodes.ESCAPE:
            this.close();
            break;
        case this.keycodes.SPACEBAR:
            this.options_autoslide && this.play();
            break;
        case this.keycodes.LEFT:
            this.prev();
            break;
        case this.keycodes.RIGHT:
            this.next();
            break;
        case this.keycodes.UP:
        case this.keycodes.NUMBLOCK_PLUS:
        case this.keycodes.PLUS:
            zoom_enabled && this.zoom_in();
            break;
        case this.keycodes.DOWN:
        case this.keycodes.NUMBLOCK_MINUS:
        case this.keycodes.MINUS:
            zoom_enabled && this.zoom_out();
            break;
        case this.keycodes.INFO:
            this.info();
            break;
        }
    }
};

Spotlight.prototype.wheel_listener = function(event) {
    //console.log("wheel_listener");
    if (this.panel && (this.options["zoom-in"] !== false)) {
        let delta = event["deltaY"];
        delta = (delta < 0 ? 1 : delta ? -1 : 0) * 0.5;
        //const rect = this.parentEl.querySelector('div:first-of-type').getBoundingClientRect();
        const rect = this.widget.getBoundingClientRect();
        //console.log(rect);
        const relativeX = event.clientX - rect.left;
        const relativeY = event.clientY - rect.top;
        //console.log(relativeX, relativeY);
        if (delta < 0) {
            this.zoom_out(event, relativeX, relativeY);
        } else {
            this.zoom_in(event, relativeX, relativeY);
        }
    }
};

Spotlight.prototype.play = function(init, _skip_animation) {
    //console.log("play", init);
    const state = (typeof init === "boolean" ? init : !this.playing);
    if (state === !this.playing) {
        this.playing = this.playing ? clearTimeout(this.playing) : 1;
        toggleClass(this.player, "on", this.playing);
        _skip_animation || this.animate_bar(this.playing);
    }
};

Spotlight.prototype.animate_bar = function(start) {
    //console.log("animate_bar", start);
    if (this.options_progress) {
        prepareStyle(this.progress, function() {
            setStyle(this.progress, "transition-duration", "");
            setStyle(this.progress, "transform", "");
        });

        if (start) {
            setStyle(this.progress, "transition-duration", this.delay + "s");
            setStyle(this.progress, "transform", "translateX(0)");
        }
    }

    if (start) {
        this.playing = setTimeout(this.next, this.delay * 1000);
    }
};

Spotlight.prototype.autohide = function() {
    //console.log("autohide");
    if (this.options_autohide) {
        this.hide_cooldown = Date.now() + 2950;
        if (!this.hide) {
            addClass(this.widget, "menu");
            this.schedule(3000);
        }
    }
};

Spotlight.prototype.schedule = function(cooldown) {
    //console.log("schedule", cooldown);
    this.hide = setTimeout(() => {
        const now = Date.now();
        if (now >= this.hide_cooldown) {
            removeClass(this.widget, "menu");
            this.hide = 0;
        } else {
            this.schedule(this.hide_cooldown - now);
        }
    }, cooldown);
};


Spotlight.prototype.menu = function(state) {
    //console.log("menu");
    if (typeof state === "boolean") {
        this.hide = state ? this.hide : 0;
    }
    if (this.hide) {
        this.hide = clearTimeout(this.hide);
        removeClass(this.widget, "menu");
    } else {
        this.autohide();
    }
};

Spotlight.prototype.start = function(e) {
    //console.log("start");
    cancelEvent(e, true);
    this.is_down = true;
    this.dragged = false;
    this.is_sliding_up = false;
    let touch = e;
    let touches = e.touches;
    this.prev_touches = touches;
    if (touches && (touches = touches[0])) {
        touch = touches;
    }
    this.slidable = (this.media_w * this.scale) <= this.viewport_w && (this.media_h * this.scale) <= this.viewport_h;
    this.startX = touch.pageX;
    this.startY = touch.pageY;
    //console.log(this.panel);
    window.activeElement = this.track;

    toggleAnimation(this.panel);
};

Spotlight.prototype.end = function(e) {
    //console.log("end");
    cancelEvent(e);
    if (this.is_down) {
        if (!this.dragged) {
            this.menu();
        } else {
            if (this.slidable && this.dragged) {
                const has_next = (this.x < -(this.viewport_w / 7)) && ((this.current_slide < this.slide_count) || this.options_infinite);
                const has_prev = has_next || (this.x > (this.viewport_w / 7)) && ((this.current_slide > 1) || this.options_infinite);
                if (has_next || has_prev) {
                    this.update_slider(this.current_slide - 1, true, this.x / this.viewport_w * 100);
                    (has_next && this.next()) ||
                            (has_prev && this.prev());
                }
                if (this.is_sliding_up && this.y < -(this.viewport_h / 4)) {
                    this.close();
                } else {
                    this.x = 0;
                    this.y = 0;
                }
                this.update_panel();
            }
            toggleAnimation(this.panel, true);
        }
        this.is_down = false;
    }
};

Spotlight.prototype.distance = function(touches) {
    //const rect = this.parentEl.querySelector('div:first-of-type').getBoundingClientRect();
    const rect = this.widget.getBoundingClientRect();
    const relativeX1 = touches[0].clientX - rect.left;
    const relativeY1 = touches[0].clientY - rect.top;
    const relativeX2 = touches[1].clientX - rect.left;
    const relativeY2 = touches[1].clientY - rect.top;
    return Math.sqrt(
        Math.pow(relativeX1 - relativeX2, 2) +
            Math.pow(relativeY1 - relativeY2, 2)
    );
};

Spotlight.prototype.center_of = function(touches) {
    //const rect = this.parentEl.querySelector('div:first-of-type').getBoundingClientRect();
    const rect = this.widget.getBoundingClientRect();
    const relativeX1 = touches[0].clientX - rect.left;
    const relativeY1 = touches[0].clientY - rect.top;
    const relativeX2 = touches[1].clientX - rect.left;
    const relativeY2 = touches[1].clientY - rect.top;
    return [
        (relativeX1 + relativeX2) * 0.5,
        (relativeY1 + relativeY2) * 0.5,
    ];
};

Spotlight.prototype.scale_touches = function(touches) {
    if (this.options["zoom-in"] !== false && touches && touches.length === 2 && this.prev_touches && this.prev_touches.length === 2) {
        const relative_scale = this.distance(touches) / this.distance(this.prev_touches);
        const center = this.center_of(touches);
        this.centered_zoom(relative_scale, center[0], center[1], false);
    }

    this.prev_touches = touches;
    return touches && touches[0];
};

Spotlight.prototype.move = function(e) {
    //console.log("move");
    cancelEvent(e);
    if (this.is_down) {
        let touches = this.scale_touches(e.touches);
        if (touches) {
            e = touches;
        }
        if (!this.dragged) {
            const dx = this.startX - e.pageX;
            const dy = this.startY - e.pageY;
            this.is_sliding_up = this.slidable && dy > Math.abs(dx) * 1.15;
        }

        if (this.is_sliding_up) {
            this.y -= this.startY - (this.startY = e.pageY);
        } else if (this.slidable) {
            this.x -= this.startX - (this.startX = e.pageX);
        } else {

            let sign = (this.media_w * this.scale - this.viewport_w) / 2;
            let diff = Math.abs(sign);
            if (sign > 0) {
                this.x -= this.startX - (this.startX = e.pageX);
            }

            if (this.x > diff) {
                this.x = diff;
            } else if (this.x < -diff) {
                this.x = -diff;
            }

            sign = (this.media_h * this.scale - this.viewport_h) / 2;
            diff = Math.abs(sign);
            if (sign > 0) {
                this.y -= this.startY - (this.startY = e.pageY);
            }

            if (this.y > diff) {
                this.y = diff;
            } else if (this.y < -diff) {
                this.y = -diff;
            }
        }
        this.dragged = true;
        this.update_panel(this.x, this.y);
    } else {
        this.autohide();
    }
};

Spotlight.prototype.fullscreen = function(init) {
    console.log("fullscreen", init);
    const is_fullscreen = this.has_fullscreen();
    if ((typeof init !== "boolean") || (init !== !!is_fullscreen)) {
        if (is_fullscreen) {
            document[this.prefix_exit]();
            //removeClass(maximize, "on");
        } else {
            this.widget[this.prefix_request]();
            //addClass(maximize, "on");
        }
    }

    //this.update_widget_viewport();
    //this.update_media_viewport();
    //this.update_panel();
};

Spotlight.prototype.theme = function(theme) {
    //console.log("theme", theme);
    if (typeof theme !== "string") {
        // toggle:
        theme = this.toggle_theme ? "" : this.options_theme || "white";
    }

    if (this.toggle_theme !== theme) {
        // set:
        this.toggle_theme && removeClass(this.widget, this.toggle_theme);
        theme && addClass(this.widget, theme);
        this.toggle_theme = theme;
    }
};

Spotlight.prototype.autofit = function(init) {

    //console.log("autofit", init);
    if (typeof init === "boolean") {
        this.toggle_autofit = !init;
    }

    this.toggle_autofit = (this.scale === 1) && !this.toggle_autofit;

    toggleClass(this.media, "autofit", this.toggle_autofit);
    setStyle(this.media, "transform", "");

    this.scale = 1;
    this.x = 0;
    this.y = 0;

    this.update_media_viewport();
    toggleAnimation(this.panel);
    this.update_panel();
    //autohide();
};

Spotlight.prototype.centered_zoom = function(relative, cx, cy, animated) {

    let value = this.scale * relative;

    toggleAnimation(this.panel, animated);
    toggleAnimation(this.media, animated);
    this.disable_autoresizer();

    if (value <= 1) {
        this.x = this.y = 0;
        this.update_panel(this.x, this.y);
        this.zoom(1);
        return;
    }

    if (value > 50) {
        return;
    }

    if (cy) {
        const half_w = this.viewport_w / 2, half_h = this.viewport_h / 2;
        this.x = cx - (cx - this.x - half_w) * relative - half_w;
        this.y = cy - (cy - this.y - half_h) * relative - half_h;
    } else {

        this.x *= relative;
        this.y *= relative;
    }

    this.update_panel(this.x, this.y);
    this.zoom(value);
};

Spotlight.prototype.zoom_in = function(e, cx, cy) {
    this.centered_zoom(1 / 0.65, cx, cy, true);
};

Spotlight.prototype.zoom_out = function(e, cx, cy) {
    this.centered_zoom(0.65, cx, cy, true);
};

Spotlight.prototype.zoom = function(factor) {
    //console.log("zoom", factor);
    this.scale = factor || 1;
    this.update_scroll();
};

Spotlight.prototype.info = function() {
    //console.log("info");
    this.footer_visible = !this.footer_visible;
    toggleVisibility(this.footer, this.footer_visible);

};

Spotlight.prototype.disable_autoresizer = function() {
    //console.log("disable_autoresizer");
    //update_media_dimension();
    if (this.toggle_autofit) {
        // removeClass(media, "autofit");
        // toggle_autofit = false;
        this.autofit();
    }
};

Spotlight.prototype.show_gallery = function() {

    //console.log("show_gallery");

    window.history.pushState({spl: 1}, "");
    window.history.pushState({spl: 2}, "");

    toggleAnimation(this.widget, true);

    addClass(this.parentEl, "hide-scrollbars");
    addClass(this.widget, "spotlight");
    addClass(this.widget, "show");


    this.toggle_listener(true);
    this.update_widget_viewport();

    this.update_media_viewport();
    toggleAnimation(this.panel);
    this.update_panel();

    //resize_listener();
    this.autohide();


    this.options_autoslide && this.play(true, true);
};

Spotlight.prototype.download = function() {
    //console.log("download", media);
    downloadImage(this.parentEl, this.media);
};

Spotlight.prototype.close = function(hashchange) {
    //console.log("close", hashchange);
    setTimeout(() => {
        console.log(this.parentEl, this.widget);
        this.parentEl?.removeChild(this.widget);
        this.panel = this.media = this.gallery = this.options = this.options_group = this.anchors = this.options_onshow = this.options_onchange = this.options_onclose = this.options_click = null;

    }, 200);

    removeClass(this.parentEl, "hide-scrollbars");
    removeClass(this.widget, "show");

    this.fullscreen(false);
    this.toggle_listener();

    window.history.go(hashchange === true ? -1 : -2);

    // teardown
    //this.gallery_next && (this.media_next.src = "");
    this.playing && this.play();
    this.media && this.checkout(this.media);
    this.hide && (this.hide = clearTimeout(this.hide));
    this.toggle_theme && this.theme();
    this.options_class && removeClass(this.widget, this.options_class);
    this.options_onclose && this.options_onclose();
};

Spotlight.prototype.checkout = function(media) {
    //console.log("checkout");
    if (media._root) {
        media._root.appendChild(media);
        media._root = null;
    } else {
        const parent = media.parentNode;
        parent && parent.removeChild(media);
        media = media.src = media.onerror = "";
    }
};

Spotlight.prototype.prev = function(e) {
    //console.log("prev");
    e && this.autohide();
    if (this.slide_count > 1) {
        if (this.current_slide > 1) {
            return this.goto(this.current_slide - 1);
        } else if (this.options_infinite) {
            this.update_slider(this.slide_count, true);
            return this.goto(this.slide_count);
        }
    }
};

Spotlight.prototype.next = function(e) {
    //console.log("next");
    e && this.autohide();
    if (this.slide_count > 1) {
        if (this.current_slide < this.slide_count) {
            return this.goto(this.current_slide + 1);
        } else if (this.options_infinite) {
            this.update_slider(-1, true);
            return this.goto(1);
        } else if (this.playing) {
            this.play();
        }
    }
};

Spotlight.prototype.goto = function(slide) {
    //console.log("goto", slide);
    if (slide !== this.current_slide) {
        if (this.playing) {
            clearTimeout(this.playing);
            this.animate_bar();
        } else {
            this.autohide();
        }

        //playing ? animate_bar() : autohide();
        const direction = slide > this.current_slide;
        this.current_slide = slide;
        this.setup_page(direction);
        //options_autoslide && play(true, true);
        return true;
    }
};

Spotlight.prototype.prepare = function(direction) {

    //console.log("prepare", direction);

    let anchor = this.anchors[this.current_slide - 1];

    this.apply_options(anchor);
    const speed = this.connection && this.connection["downlink"];
    let size = Math.max(this.viewport_h, this.viewport_w) * this.dpr;
    if (speed && ((speed * 1200) < size)) {
        size = speed * 1200;
    }
    let tmp;
    this.gallery = {
        media: this.options_media,
        src: parse_src(anchor, size, this.options, this.options_media),
        title: this.parse_option("title",
            anchor["alt"] || anchor["title"] ||
                // inherit title from a direct child only
                ((tmp = anchor.firstElementChild) && (tmp["alt"] || tmp["title"])))
    };

    //this.gallery_next && (this.media_next.src = this.gallery_next = "");

    if (this.options_preload && direction) {
        if ((anchor = this.anchors[this.current_slide])) {
            const options_next = anchor.dataset || anchor;
            const next_media = options_next["media"];
            if (!next_media || (next_media === "image")) {
                this.gallery_next = parse_src(anchor, size, options_next, next_media);
            }
        }
    }

    // apply controls

    for (let i = 0; i < this.controls.length; i++) {
        const option = this.controls[i];
        //console.log(option + ": ", options[option]);
        toggleDisplay(this.controls_dom[option], this.parse_option(option, this.controls_default[option]));
    }
};

Spotlight.prototype.setup_page = function(direction) {
    //console.log("setup_page", direction);
    this.x = 0;
    this.y = 0;
    this.scale = 1;

    if (this.media) {
        // Note: the onerror callback was removed when the image was fully loaded (also for video)
        if (this.media.onerror) {
            this.checkout(this.media);
        } else {
            let ref = this.media;
            setTimeout(() => {
                if (ref && (this.media !== ref)) {
                    this.checkout(ref);
                    ref = null;
                }
            }, 650);

            // animate out the old image
            this.prepare_animation();
            this.update_panel();
        }
    }

    this.footer && toggleVisibility(this.footer, 0);

    this.prepare(direction);
    this.update_slider(this.current_slide - 1);
    removeClass(this.spinner, "error");
    this.init_slide(this.current_slide);
    toggleAnimation(this.panel);
    this.update_panel();

    const str_title = this.gallery.title;
    const str_description = this.parse_option("description");
    const str_button = this.parse_option("button");
    const has_content = str_title || str_description || str_button;

    if (has_content) {

        //str_title && setText(this.title, str_title);
        //str_description && setText(this.description, str_description);
        this.title.innerHTML = str_title;
        this.description.innerHTML = str_description;
        str_button && setText(this.button, str_button);

        toggleDisplay(this.title, str_title);
        toggleDisplay(this.description, str_description);
        toggleDisplay(this.button, str_button);

        setStyle(this.footer, "transform", this.options_autohide === "all" ? "" : "none");
    }

    this.options_autohide || addClass(this.widget, "menu");

    toggleVisibility(this.footer, this.footer_visible && has_content);
    toggleVisibility(this.page_prev, this.options_infinite || (this.current_slide > 1));
    toggleVisibility(this.page_next, this.options_infinite || (this.current_slide < this.slide_count));
    setText(this.page, this.slide_count > 1 ? this.current_slide + " / " + this.slide_count : "");

    this.options_onchange && this.options_onchange(this.current_slide, this.options);
};



//    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
//        module.exports = Spotlight;
//    } else {
//        window.Spotlight = Spotlight;
//    }

//})(window);
