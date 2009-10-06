/*
Script: MooFlickr.js
    Ajax image gallery which uses Flickr API

    License:
        MIT-style license.

    Authors:
        Amitay Horwitz <amitayh@gmail.com>
*/

var MooFlickr = new Class({
    
    Implements: [Options, Events],

    options: {
        loadFirstGallery: true,
        loadFirstImage: true,
        selectors: {
            galleries: '.galleries',
            imageDisplay: '.image',
            carousel: '.scrollArea',
            carouselPrev: '.scrollPrev',
            carouselNext: '.scrollNext'
        },
        galleryPicker: {},
        carousel: {},
        request: {
            url: 'MooFlickr.php',
            method: 'get'
        }
    },
    
    initialize: function(container, options) {
        $extend(this.options.request, {
            onFailure: $empty
        });
        this.setOptions(options);
        this.container = $(container);
        this.imageDisplay = new MooFlickr.ImageDisplay(
            this.getElement('imageDisplay')
        );
        this.initGalleryPicker();
        this.initCarousel();
    },
    
    getElement: function(selector) {
        return this.container.getElement(this.options.selectors[selector]);
    },
    
    initGalleryPicker: function() {
        this.galleryPicker = new MooFlickr.GalleryPicker(
            this.getElement('galleries')
        );
        this.galleryPicker.addEvent('select', function(gallery) {
            this.imageDisplay.unload();
            this.loadGallery(gallery.id);
        }.bind(this));
    },
    
    initCarousel: function() {
        this.carousel = new MooFlickr.Carousel(
            this.getElement('carousel'),
            this.options.carousel
        );
        this.getElement('carouselPrev')
            .addEvent('click', function(e) {
                this.carousel.prev();
            }.bind(this));
        this.getElement('carouselNext')
            .addEvent('click', function(e) {
                this.carousel.next();
            }.bind(this));
        this.carousel.addEvent('itemImageLoaded', function(item) {
            item.imgEl.addEvent('click', function() {
               this.loadImage(item);
            }.bind(this));
        }.bind(this));
    },
    
    loadImage: function(item) {
        if (this._currentItem && this._currentItem == item) { return; }
        this.carousel.select(item);
        this.imageDisplay.load(item);
        this._currentItem = item;
    },
    
    loadUserGalleries: function(user_id) {
        this.galleryPicker.empty().setLoadingText();
        this.reset();
        var params = new Hash({action: 'getPhotosetList', user_id: user_id});
        new Request.JSON(
            $extend(this.options.request, {
                onSuccess: function(response) {
                    var firstItem = null;
                    if (response) {
                        response.each(function(gallery) {
                            if (!firstItem) { firstItem = gallery; }
                            this.galleryPicker.add(gallery);
                        }, this);
                        if (this.options.loadFirstGallery) {
                            this.galleryPicker.select(firstItem);
                        }
                    }
                }.bind(this)
            })
        ).send(params.toQueryString());
    },
    
    loadGallery: function(gallery_id) {
        this.reset();
        var params = new Hash({action: 'getPhotosetPhotos', photoset_id: gallery_id});
        new Request.JSON(
            $extend(this.options.request, {
                onSuccess: function(response) {
                    var firstItem = null;
                    if (response && response.photo) {
                        response.photo.each(function(image) {
                            var item = this.carousel.add(image);
                            if (!firstItem) { firstItem = item; }
                            if (item.isVisible()) {
                                item.load();
                            }
                        }, this);
                    }
                    if (this.options.loadFirstImage && firstItem) {
                        this.loadImage(firstItem);
                    }
                }.bind(this)
            })
        ).send(params.toQueryString());
    },
    
    reset: function() {
        this.imageDisplay.unload();
        this.carousel.empty();
    }
    
});

MooFlickr.GalleryPicker = new Class({
    
    Implements: [Options, Events],
    
    options: {
        loadingText: 'טוען גלריות, אנא המתן...',
        templates: {
            title: '<div class="arrow-down"></div>{title}',
            gallery: '<h4><img src="{thumbnail}" alt="{title}" width="75" height="75" />{title}</h4><p>{description}</p><p class="details">{photos} תמונות</p><div class="clear"></div>'
        },
        slider: {
            duration: 500,
            link: 'cancel'
        }
    },
    
    initialize: function(container, options) {
        this.setOptions(options);
        this.container = $(container);
        this.title = new Element('h3', {html: '&nbsp;'}).inject(this.container);
        this.ul = new Element('ul').inject(this.container);
        this.slider = new Fx.Slide(this.ul, this.options.slider).hide();
        this.slider.wrapper.setStyles({
            position: 'absolute',
            zIndex: '9999',
            width: '620px'
        });
        this.state = 'close';
        this.title.addEvent('click', function() {
            this.toggleList();
        }.bind(this));
        $(document).addEvent('click', function(e) {
            if (!this.container.hasChild($(e.target))) {
                this.closeList();
            }
        }.bind(this));
    },
    
    empty: function() {
        delete this._currentItem;
        this.closeList().chain(function() {
            this.ul.empty();
        }.bind(this));
        return this;
    },
    
    setLoadingText: function() {
        this.title.set('html', this.options.loadingText);
    },
    
    add: function(gallery) {
        gallery.description = gallery.description.linebreaks();
        var li = new Element('li', {
            html: this.options.templates.gallery.substitute(gallery)
        });
        li.addEvent('click', function() {
            this.select(gallery);
        }.bind(this));
        li.inject(this.ul);
        return li;
    },
    
    select: function(gallery) {
        if (this._currentItem && this._currentItem == gallery) { return; }
        this.title.set('html', this.options.templates.title.substitute(gallery));
        this.closeList();
        this.fireEvent('select', gallery);
        this._currentItem == gallery;
    },
    
    toggleList: function() {
        return this[(this.state == 'close' ? 'open' : 'close') + 'List']();
    },
    
    openList: function() {
        this.state = 'open';
        return this.slider.slideIn();
    },
    
    closeList: function(how) {
        this.state = 'close';
        return this.slider.slideOut();
    }
    
});

MooFlickr.ImageDisplay = new Class({
    
    Implements: [Options, Events],
    
    options: {
        fx: {
            property: 'opacity',
            duration: 500,
            link: 'cancel'
        }
    },
    
    initialize: function(container, options) {
        this.setOptions(options);
        this.container = $(container);
    },
    
    load: function(item) {
        var that = this;
        var canShow = false, img;
        function show() {
            if (canShow) {
                that.img = img;
                img.setStyles({
                    'margin-top': -(img.height / 2 + 5).toInt() + 'px',
                    'margin-right': -(img.width / 2 + 5).toInt() + 'px'
                });
                img.retrieve('fx').set(0);
                img.inject(that.container);
                img.retrieve('fx').start(1);
            } else {
                canShow = true;
            }
        }
        if (this.img) {
            this.unload().chain(function() {
                this.img.destroy();
                show();
            }.bind(this));
        } else {
            show();
        }
        var img = new Asset.image(item.getImageUrl(), {
            onload: function() {
                that.fireEvent('load');
                show();
            }
        });
        img.store('fx', new Fx.Tween(img, this.options.fx));
    },
    
    unload: function() {
        if (this.img) {
            return this.img.retrieve('fx').start(0);
        }
    }
    
});

MooFlickr.Image = new Class({
    
    initialize: function(image) {
        this.image = image;
        return this;
    },
    
    getImageUrl: function(size) {
        if (this.image) {
            size = size || MooFlickr.Image.Size.medium;
            var pattern = 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}{size}.jpg';
            return pattern.substitute($extend(this.image, {size: size}));
        }
        return null;
    }
    
});

MooFlickr.Image.Size = {square: '_s', thumb: '_t', small: '_m', medium: '', large:  '_b'};

MooFlickr.Carousel = new Class({
    
    Implements: [Options, Events],

    options: {
        width: 86,
        style: 'horizonal',
        bindKeyboard: true,
        bindMousewheel: true,
        visible: 6,
        step: 5,
        cycle: true,
        fx: {
            link: 'cancel',
            duration: 500,
            transition: Fx.Transitions.Cubic.easeInOut
        },
        styles: {
            normal: {'border-color': '#555'},
            selected: {'border-color': '#fff'}
        }
    },
    
    initialize: function(container, options) {
        this.setOptions(options);
        this.container = $(container);
        this.scroller = new Element('ul').inject(this.container);
        if (this.options.bindKeyboard) {
            $(document).addEvent('keydown', function(e) {
                var actions = {left: 'next', right: 'prev'};
                if (actions[e.key]) {
                    e.stop();
                    this[actions[e.key]]();
                }
            }.bind(this));
        }
        if (this.options.bindMousewheel) {
            this.container.addEvent('mousewheel', function(e) {
                e.stop();
                this[(e.wheel < 0 ? 'next' : 'prev')](1, false);
            }.bind(this));
        }
        this.fx = new Fx.Tween(this.scroller, $extend(
            this.options.fx,
            {property: 'margin-' + (this.options.style == 'horizonal' ? 'right' : 'top')}
        ));
        this.items = [];
        this.reset();
    },
    
    reset: function() {
        this.scroller.setStyles({
            width: (this.items.length * this.options.width) + 'px'
        });
    },
    
    start: function(index) {
        if (index != this.index) {
            this.index = index;
            this.loadVisible();
            this.fireEvent('scrollStart', index);
            var that = this;
            this.fx.start(-(this.index * this.options.width)).chain(function() {
                that.fireEvent('scrollEnd', index);
            });
        }
    },
    
    next: function(step, cycle) {
        step = step || this.options.step;
        cycle = $defined(cycle) ? cycle : this.options.cycle;
        var index = this.index;
        if (index + step >= this.items.length) {
            if (cycle) {
                index = 0;
            }
        } else {
            index += step;
        }
        this.start(index);
        return this;
    },
    
    prev: function(step, cycle) {
        step = step || this.options.step;
        cycle = $defined(cycle) ? cycle : this.options.cycle;
        var index = this.index;
        index -= step;
        if (index < 0) {
            if (this.index == 0 && cycle) {
                index = (Math.ceil(this.items.length / step) - 1) * step;
            } else {
                index = 0;
            }
        }
        this.start(index);
        return this;
    },
    
    add: function(image) {
        var item = new MooFlickr.Carousel.Item(this, image);
        item.addEvent('load', function() {
            this.fireEvent('itemImageLoaded', item);
        }.bind(this));
        this.items.push(item);
        this.reset();
        $(item).inject(this.scroller);
        return item;
    },
    
    empty: function() {
        delete this._currentItem;
        this.index = 0;
        this.items = [];
        this.fx.set(0);
        this.scroller.empty();
        this.reset();
        return this;
    },
    
    select: function(item) {
        if (this._currentItem) {
            this._currentItem.Fx.start(this.options.styles.normal);
        }
        item.Fx.start(this.options.styles.selected);
        this._currentItem = item;
    },
    
    loadVisible: function() {
        for (var i = this.index, l = i + this.options.visible; i < l; i++) {
            var item = this.items[i];
            if (item) {
                item.load();
            }
        }
    }
    
});

MooFlickr.Carousel.Item = new Class({
    
    Implements: [Events, Options, MooFlickr.Image],
    
    options: {
        fx: {
            link: 'cancel',
            duration: 300
        }
    },
    
    initialize: function(carousel, image, options) {
        this.setOptions(options);
        this.carousel = carousel;
        this.image = image;
        this.liEl = new Element('li');
        this.Fx = new Fx.Morph(this.liEl, this.options.fx);
        this.loaded = false;
        this.loading = false;
        return this;
    },
    
    load: function(image) {
        if (!this.loading && !this.loaded) {
            this.loading = true;
            var that = this;
            this.imgEl = new Asset.image(this.getImageUrl(MooFlickr.Image.Size.square), {
                onload: function() {
                    this.loading = false;
                    that.loaded = true;
                    that.fireEvent('load');
                    this.fade('hide').inject(that.liEl).fade('in');
                }
            });
        }
    },
    
    isVisible: function() {
        var start = this.carousel.index;
        var end = start + this.carousel.options.visible - 1;
        return new Number(this.getIndex()).inRange(start, end);
    },
    
    getIndex: function() {
        return this.carousel.items.indexOf(this);
    },
    
    toElement: function() {
        return this.liEl;
    }
    
});

Number.implement({
    inRange: function(start, end) {
        return (this >= start && this <= end);
    }
});

String.implement({
    linebreaks: function() {
        return '<p>' + this.trim().replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />') + '</p>';
    },
    htmlentities: function() {
        var str = this;
        str = str.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return str;
    }
});