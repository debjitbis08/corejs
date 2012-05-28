CoreJS
======

A lightweight modular JavaScript framework.

CoreJS is inspired by:

  * The talk by Nicholas C. Zakas - ["Scalable JavaScript Application Architecture"](https://www.youtube.com/watch?v=vXjVFPosQHw) ([Slides](http://www.slideshare.net/nzakas/scalable-javascript-application-architecture)).
  * This [article](http://addyosmani.com/largescalejavascript/) by [Addy Osmani](http://twitter.com/addyosmani).
  * and [scaleApp](https://github.com/flosse/scaleApp).

Please note, presently the internal modules are dependent on jQuery but feel free to modify them based on your preference.

```javascript
/******* Example Module Code *******/

corejs.register("tabs", function (sb) {
  /* Factory function for tabs */
  var root, changeTab, activeTab;

  changeTab = function (showTab)  {
    $(root).find('.tab-link-item').removeClass('active');
    $(root).find('.tab-link-item[href="' + showTab + '"]').addClass('active');

    $(root).find('.tabs-content .content').removeClass('active');
    $(root).find(showTab).addClass('active');

    activeTab = showTab;
  };

  return {
    init: function (opts) {
      root = opts.el;

      activeTab = $(root).find('.tab-link-item.active').attr('href');

      $(root).find('.tab-links').delegate('.tab-link-item', 'click', function (e) {
        changeTab($(this).find('a').attr('href'));

        sb.publish("tabChanged", {
          "activeTab": $(this).find('a').attr('href')
        });
      });
    },
    destroy: function () {
      $(root).find('.tab-links').undelegate('.tab-link-item', 'click');
    }
  };
}, {
  /* Options for tabs */
  'associatedClass': 'tabs-area'
});
```
