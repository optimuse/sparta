/*
 * Copyright (C) 2015 Stratio (http://stratio.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function () {
  'use strict';

  /*POLICY CREATION AND EDITION CONTROLLER*/
  angular
    .module('webApp')
    .controller('PolicyCtrl', PolicyCtrl);

  PolicyCtrl.$inject = ['WizardStatusService', 'TemplateFactory', 'PolicyModelFactory', 'PolicyFactory', 'ModalService', 'PolicyService', '$state', '$scope', '$timeout', '$stateParams', '$q'];
  function PolicyCtrl(WizardStatusService, TemplateFactory, PolicyModelFactory, PolicyFactory, ModalService, PolicyService, $state, $scope, $timeout, $stateParams, $q) {
    var vm = this;

    vm.confirmPolicy = confirmPolicy;
    vm.closeErrorMessage = closeErrorMessage;
    vm.onClickNextStep = onClickNextStep;
    vm.showPreviousStepButton = showPreviousStepButton;
    vm.showNextStepButton = showNextStepButton;
    vm.isLastStep = isLastStep;
    vm.onClickPreviousStep = WizardStatusService.previousStep;

    init();

    function init() {
      initTemplate().then(function () {
        initPolicy().then(function () {
          vm.status = WizardStatusService.getStatus();
          if (vm.policy && vm.status.currentStep == 0) {
            vm.steps = PolicyModelFactory.getTemplate().steps;
            vm.successfullySentPolicy = false;
            vm.error = PolicyModelFactory.getError();
            vm.showStepNavigation = true;
          }
          else {
            $state.go('dashboard.policies');
          }
        });
      });
    }

    function initTemplate() {
      var defer = $q.defer();
      if (Object.keys(PolicyModelFactory.getTemplate()).length == 0) {
        TemplateFactory.getPolicyTemplate().then(function (template) {
          PolicyModelFactory.setTemplate(template);
          defer.resolve();
        });
      } else {
        defer.resolve();
      }
      return defer.promise;
    }

    function initPolicy() {
      var defer = $q.defer();
      var id = $stateParams.id;
      if (id) {
        PolicyFactory.getPolicyById(id).then(
          function (policyJSON) {
            PolicyModelFactory.setPolicy(policyJSON);
            vm.policy = PolicyModelFactory.getCurrentPolicy();
            vm.editionMode = true;
            WizardStatusService.nextStep();
            defer.resolve();
          });
      } else {
        vm.policy = PolicyModelFactory.getCurrentPolicy();
        vm.editionMode = false;
        defer.resolve();
      }
      return defer.promise;
    }

    function closeErrorMessage() {
      PolicyModelFactory.setError(null);
    }

    function confirmPolicy() {
      var defer = $q.defer();
      if (!vm.status.nextStepAvailable) {
        $scope.$broadcast('forceValidateForm', 1);
        defer.resolve();
      } else {
        defer = sendPolicy();
      }
      return defer.promise;
    }

    function sendPolicy() {
      var defer = $q.defer();
      var modalInstance = openConfirmPolicyModal();
      modalInstance.result.then(function () {
        savePolicy().then(function () {
          PolicyModelFactory.resetPolicy();
          $state.go("dashboard.policies");
          defer.resolve();
        }, function (error) {
          if (error) {
            if (error.data.message) {
              PolicyModelFactory.setError(error.data.message);
            }
            else {
              PolicyModelFactory.setError(error.data);
            }
          }
          defer.reject();
        });
      });
      return defer;
    }

    function openConfirmPolicyModal() {
      var templateUrl = "templates/modal/confirm-modal.tpl.html";
      var controller = "ConfirmModalCtrl";
      var resolve = {
        title: function () {
          if (vm.editionMode) {
            return "_POLICY_._WINDOW_._EDIT_._TITLE_";
          } else {
            return "_POLICY_._WINDOW_._CONFIRM_._TITLE_";
          }
        },
        message: function () {
          return "";
        }
      };
      return ModalService.openModal(controller, templateUrl, resolve, '', 'lg');
    }

    function savePolicy() {
      var defer = $q.defer();
      PolicyService.generateFinalJSON().then(function (finalJSON) {
        PolicyModelFactory.setFinalJSON(finalJSON);
        if (vm.editionMode) {
          PolicyFactory.savePolicy(finalJSON).then(function () {
            defer.resolve();
          }, function (error) {
            defer.reject(error)
          });
        } else {
          PolicyFactory.createPolicy(finalJSON).then(function () {
            defer.resolve();
          }, function (error) {
            defer.reject(error)
          });
        }
      });
      return defer.promise;
    }

    function showPreviousStepButton() {
      return vm.steps && vm.status.currentStep > 0;
    }

    function showNextStepButton() {
      return vm.steps && vm.status.currentStep < vm.steps.length - 1;
    }

    function isLastStep() {
      return vm.steps && vm.status.currentStep == vm.steps.length - 1;
    }

    function onClickNextStep() {
      if (vm.status.nextStepAvailable) {
        WizardStatusService.nextStep();
      } else {
        $scope.$broadcast('forceValidateForm', 1);
      }
    }

    $scope.$watchCollection(
      "wizard.error",
      function (error) {
        if (error && error.text != "") {
          $timeout(function () {
            PolicyModelFactory.setError();
          }, 6000);
        }
      }
    )
  }
})();
