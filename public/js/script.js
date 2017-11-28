var next = 12;

(function() {

  // ************ Handlebars Setup ************ //

  Handlebars.templates = Handlebars.templates || {};

  var templates = document.querySelectorAll('template');

  Array.prototype.slice.call(templates).forEach(function(tmpl) {
    Handlebars.templates[tmpl.id] = Handlebars.compile(tmpl.innerHTML.replace(/{{&gt;/g, '{{>'));
  });

  Handlebars.partials = Handlebars.templates;

  // ************ Backbone app ************ //

  // ************ VIEWS ************ //

  var ImagesView = Backbone.View.extend({
    initialize: function() {
      var view = this;
      this.model.on('change', () => {
        view.render();
      })
    },
    render: function() {
      var data = this.model.toJSON();
      var images = data.images;
      var dataSliced = images.slice(0, 12);
      this.$el.html(Handlebars.templates.image({images:dataSliced}))
    },
    events: {
      'click #more-button': function () {
        next += 12;
        var images = this.model.get('images');
        var sliced = images.slice(0, next);
        this.$el.html(Handlebars.templates.image({images: sliced}))
        }
    }
  })

  var UploadView = Backbone.View.extend({
    initialize: function()  {
      var view = this;
        view.render();
    },
    render: function() {
      this.$el.html(Handlebars.templates.upload())
    },
    events: {
      'click #upload-button': function() {
        this.model.set({
          file: $('input[type="file"]').get(0).files[0],
          username: $('input[name="username"]').val(),
          title: $('input[name="title"]').val(),
          description: $('textarea').val()
        })
        this.model.savePic()
      }
    }
  })

  var ImageView = Backbone.View.extend({
    initialize: function(options) {
      this.otherModel = options.otherModel
      var view = this;
      this.model.on('change', () => {
        view.render();
      })
    },
    render: function() {
      this.$el.html(Handlebars.templates.comments(this.model.toJSON()))
    },
    events: {
      'click #post-button': function() {
        this.otherModel.set({
          comment: $('textarea[name="comment"]').val(),
          username: $('textarea[name="username"]').val(),
          id: this.model.toJSON().id
        })
        this.otherModel.save().then((data) => {
          if(data.success){
            this.model.trigger('success')
            $('textarea[name="comment"]').val("")
          }
          else{
            alert("Both fields are required to submit a comment!")
          }
        })
      }
    }
  })

  // ************ MODELS ************ //

  var ImagesModel = Backbone.Model.extend({
    initialize: function() {
      this.fetch().then((res) => {
        var images = this.get('images')
      })
    },
    url: //'/images'
     function (){
       var images = this.get('images')
       if(!images){
        return '/images'
      } else {
        var images = this.get('images')
        return '/images?offset='+ images.length
      }
    }
  })

  var ImageModel = Backbone.Model.extend({
    initialize: function(){
      this.fetch();
    },
    url: function() {
    return `/image/${this.get('id')}`
    }
  })

  var CommentsModel = Backbone.Model.extend({
    url: '/uploadComment'
  })

  var UploadModel = Backbone.Model.extend({
    savePic: function() {
      var formData = new FormData();
      formData.append('file', this.get('file'));
      formData.append('username', this.get('username'));
      formData.append('title', this.get('title'));
      formData.append('description', this.get('description'));
      var model = this;
      $.ajax({
          url: '/uploadPic',
          method: 'POST',
          data: formData,
          processData: false,
          contentType: false,
      }).then((data) => {
          if(data.success){
            model.trigger('success')
          }
          else{
            alert("Please enter a title, username and description!")
          }
      })
    }
  })

  // ************ ROUTER ************ //

  var main = $('main');

  var Router = Backbone.Router.extend({
    routes: {
      'home': 'home',
      'upload':'upload',
      'image/:id': 'image'
    },
    home: function() {
      main.off();
      new ImagesView({
        el: 'main',
        model: new ImagesModel
      })
    },
    upload: function(){
      main.off();
      var uploadModel = new UploadModel
      new UploadView({
        el: 'main',
        model: uploadModel.on("success", function(){
          location.hash = '#home'
        })
      })
    },
    image: function(id){
      var commentsModel = new CommentsModel
      var imageModel = new ImageModel({id:id})
      main.off();
      new ImageView({
        el: 'main',
        model: imageModel.on("success", function(){
          imageModel.fetch()
        }),
        otherModel: commentsModel
      })
    }
  })

  var router = new Router;
  Backbone.history.start();

})();
