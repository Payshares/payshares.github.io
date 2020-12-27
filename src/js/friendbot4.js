// Friendbot 4

(function() {
  $('.js-friendbot4').each(function() {
    var $fb4 = $(this);
    var CONFIG = {
      horizonUri: 'https://horizon-testnet.payshares.org' // no trailing slash
    };

    // initial state template
    var state = {
      currentStep: 0,
      maxStep: 1, // highest index of step we can go to
      endingStep: 4,
      keypair: {
        seed: '',
        address: ''
      },
      step1: {
        result: ''
      },
      step2: {
        friendbotStatus: '',
        friendbotError: '',
        customAddress: '',
      },
      step3: {
        result: '',
      }
    };

    // Navigation
    var canNavPrev = function() {
      return state.currentStep > 0;
    };
    var canNavNext = function() {
      return state.currentStep !== state.maxStep;
    };
    var ensureTopVisible = function() {
      if ($fb4[0].getBoundingClientRect().top < 0) {
        window.scrollTo(window.scrollX, $fb4.offset().top - 18);
      }
    };
    $fb4.find('.js-friendbot4__nav__prev').on('click', function() {
      if (canNavPrev()) {
        state.currentStep = state.currentStep - 1;
        ensureTopVisible();
        render();
      }
    });
    $fb4.find('.js-friendbot4__nav__next').on('click', function() {
      if (canNavNext()) {
        state.currentStep = state.currentStep + 1;
        ensureTopVisible();
        render();
      }
    });
    $fb4.find('.js-friendbot4__nav__minimize').on('click', function() {
      state.currentStep = 1;
      render();
    });

    // Step 0
    $fb4.find('.js-friendbot4-step0__start').on('click', function() {
      $(this).blur();
      state.currentStep = 1;
      render();
    });

    // Step 1
    $fb4.find('.js-friendbot4-step1-generate').on('click', function() {
      var keypair = PaysharesSdk.Keypair.random();
      state.keypair.seed = keypair.seed();
      state.keypair.address = keypair.address();
      state.maxStep = 2;
      state.step1.result = '' +
        '{\n' +
        '  "public key": "' + state.keypair.address + '",\n' +
        '  "secret key": "' + state.keypair.seed + '"\n' +
        '}';
      render();
    });

    // Step 2
    $fb4.find('.js-friendbot4__bot__button').on('click', function() {
      state.step2.friendbotStatus = 'Asking Stroopy...';
      state.step2.friendbotError = '';
      state.step2.friendbotDisabled = true;

      var requestAddress = state.keypair.address;
      var inputVal = $fb4.find('.js-friendbot4__bot__input').val();
      if (inputVal !== state.keypair.address) {
        requestAddress = state.step2.customAddress = inputVal;
      }
      render();

      $.ajax({
        url: 'https://horizon-testnet.payshares.org/friendbot?addr=' + requestAddress,
      })
      .fail(function (data) {
        if (typeof data === 'undefined') {
          state.step2.friendbotStatus = 'Network connection problem. Try again in a moment.';
          state.step2.friendbotDisabled = false;
        } else {
          state.step2.friendbotStatus = 'We\'re having a server issue: ';
          state.step2.friendbotError = data.responseText;
          state.step2.friendbotDisabled = false;
        }
        render();
      })
      .done(function(data) {
        state.step2.friendbotStatus = 'Stakks have arrived!';
        state.maxStep = 3;
        render();
      });
    });

    // Step 3
    $fb4.find('.js-friendbot4-step3-run').on('click', function() {
      state.maxStep = 4;
      $.ajax({
        type: 'GET',
        url: CONFIG.horizonUri + '/accounts/' + state.keypair.address,
        success: function (result) {
          state.step3.result = JSON.stringify(result, null, 2);
          render();
        },
        error: function() {
          state.step3.result = 'Couldn\'t find test account due to a server issue. Report in our public Slack channel and try creating an account again later.';
          render();
        }
      });
    });

    var render = function() {
      // show the current step
      $fb4.find('[js-friendbot4-step]').hide()
          .filter('[js-friendbot4-step=' + state.currentStep + ']').show();

      // helpers
      var setButtonDisabled = function(button, disabled) {
        if (disabled) {
          button.addClass('is-disabled').attr('disabled', 'disabled');
        } else {
          button.removeClass('is-disabled').removeAttr('disabled');
        }
      };

      // navigation
      if (state.currentStep > 0) {
        $fb4.find('.js-friendbot4__navWrapper').show();
      } else {
        $fb4.find('.js-friendbot4__navWrapper').hide();
      }

      if (state.currentStep === state.endingStep) {
        $fb4.find('.js-friendbot4__nav__next').hide();
      } else {
        $fb4.find('.js-friendbot4__nav__next').show();
      }

      setButtonDisabled($('.js-friendbot4__nav__next'), !canNavNext());
      setButtonDisabled($('.js-friendbot4__nav__prev'), !canNavPrev());

      // step 1
      $fb4.find('.js-friendbot4-step1-result').text(state.step1.result);
      syntaxHighlight($fb4.find('.js-friendbot4-step1-result'));

      // step 2
      $fb4.find('.js-friendbot4__bot__button__status').text(state.step2.friendbotStatus);
      $fb4.find('.js-friendbot4__bot__button__error__code').text(state.step2.friendbotError);
      if (state.step2.friendbotError != '') {
        $fb4.find('.js-friendbot4__bot__button__error').addClass('is-populated');
      } else {
        $fb4.find('.js-friendbot4__bot__button__error').removeClass('is-populated');
      }

      syntaxHighlight($fb4.find('.js-friendbot4__bot__button__error__code'));

      if (state.step2.customAddress !== '') {
        $fb4.find('.friendbot4__bot__input').val(state.step2.customAddress);
      } else {
        $fb4.find('.friendbot4__bot__input').val(state.keypair.address);
      }

      setButtonDisabled($('.js-friendbot4__bot__button'), state.step2.friendbotDisabled);

      // step 3
      $fb4.find('.js-friendbot4-step3-request').text('curl -X GET \'' + CONFIG.horizonUri + '/accounts/' + state.keypair.address + '\'');
      $fb4.find('.js-friendbot4-step3-result').text(state.step3.result);
      syntaxHighlight($fb4.find('.js-friendbot4-step3-request'));
      syntaxHighlight($fb4.find('.js-friendbot4-step3-result'));

      // step 4
      $fb4.find('.js-friendbot4-step4-address').text(state.keypair.address);
      $fb4.find('.js-friendbot4-step4-seed').text(state.keypair.seed);
    };
    render();
  });
})();
