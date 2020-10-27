/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * LIT App global settings menu
 */

// tslint:disable:no-new-decorators
// mwc-radio import placeholder - DO NOT REMOVE
// mwc-formfield import placeholder - DO NOT REMOVE
// mwc-textfield import placeholder - DO NOT REMOVE
import '@material/mwc-formfield';
import '@material/mwc-radio';
import '@material/mwc-textfield';
import '../elements/checkbox';

import {MobxLitElement} from '@adobe/lit-mobx';
import {customElement, html, property, TemplateResult} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {action, computed, observable} from 'mobx';

import {app} from '../core/lit_app';
import {AppState, SettingsService} from '../services/services';

import {styles} from './global_settings.css';
import {styles as sharedStyles} from './shared_styles.css';

type TabName = 'Models'|'Dataset'|'Layout';
const MODEL_DESC =
    'Models that are currently loaded in LIT. Select a model from the list \
    below to see other models that it can be compared to.';
const DATASET_DESC =
    'Select a compatible dataset to test with the selected models.';
const LAYOUT_DESC =
    'Select a LIT layout. Each layout will display different modules.';

const SELECTED_TXT = 'Selected';
const COMPATIBLE_TXT = 'Compatible';
const INCOMPATIBLE_TXT = 'Incompatible';
/**
 * The global settings menu
 */
@customElement('lit-global-settings')
export class GlobalSettingsComponent extends MobxLitElement {
  @property({type: Boolean}) isOpen = false;
  @property({type: Object}) close = () => {};

  static get styles() {
    return [sharedStyles, styles];
  }
  private readonly appState = app.getService(AppState);
  private readonly settingsService = app.getService(SettingsService);

  @observable private selectedDataset: string = '';
  @observable private selectedLayout: string = '';
  @observable private readonly modelCheckboxValues = new Map<string, boolean>();
  @observable private selectedTab: TabName = 'Dataset';

  @computed
  get selectedModels() {
    const modelEntries = [...this.modelCheckboxValues.entries()];
    return modelEntries.filter(([modelName, isSelected]) => isSelected)
        .map(([modelName, isSelected]) => modelName);
  }


  // tslint:disable-next-line:no-any
  updated(changedProperties: Map<string, any>) {
    // Because this component is always rendered, it just changes from open to
    // closed state, we want to initialize it's local state and rerender
    // whenever it changes from closed to open.
    if (changedProperties.has('isOpen') && this.isOpen) {
      this.initializeLocalState();
      this.requestUpdate();
    }
  }

  @action
  initializeLocalState() {
    this.modelCheckboxValues.clear();
    Object.keys(this.appState.metadata.models).forEach(modelName => {
      this.modelCheckboxValues.set(modelName, false);
    });
    this.appState.currentModels.forEach(modelName => {
      this.modelCheckboxValues.set(modelName, true);
    });

    this.selectedDataset = this.appState.currentDataset;
    this.selectedLayout = this.appState.layoutName;
  }

  @action
  submitSettings() {
    const models = this.selectedModels;
    const dataset = this.selectedDataset;
    const layoutName = this.selectedLayout;

    this.settingsService.updateSettings({
      models,
      dataset,
      layoutName,
    });
  }

  render() {
    const hiddenClassMap = classMap({hide: !this.isOpen});
    // clang-format off
    return html`
      <div id="global-settings-holder">
        <div id="overlay" class=${hiddenClassMap}></div>
        <div id="global-settings" class=${hiddenClassMap}>
        <div id="title-bar">Configure LIT</div>
        <div id="holder">
          <div id="sidebar">
            ${this.renderTabs()}
            ${this.renderLinks()}
          </div>
          <div id="main-panel">
            ${this.renderConfig()}
            ${this.renderBottomBar()}
          </div>
        </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  /** Render the control tabs. */
  private renderTabs() {
    const tabs: TabName[] = ['Dataset', 'Models', 'Layout'];
    const renderTab = (tab: TabName) => {
      const click = () => this.selectedTab = tab;
      const classes = classMap({tab: true, selected: this.selectedTab === tab});
      return html`<div class=${classes} @click=${click}>${tab}</div>`;
    };
    return html`
    <div id="tabs">
      ${tabs.map(tab => renderTab(tab))}
    </div>
    `;
  }

  /** Render the links at the bottom of the page. */
  private renderLinks() {
    // TODO(lit-dev): update link when website is live.
    const help =
        'https://github.com/PAIR-code/lit/blob/main/docs/user_guide.md';
    const github = 'https://github.com/PAIR-code/lit';
    return html`
    <div id="links">
      <a href=${github} target="_blank">
        Github
      </a>
      •
      <a href=${help} target="_blank">
        Help & Tutorials
      </a>
    </div>
    `;
  }

  /**
   * Render the bottom bar with the currently selected options, as well as
   * buttons.
   */
  private renderBottomBar() {
    const modelClasses =
        classMap({info: true, disabled: !this.selectedModels.length});
    const modelsStr =
        this.selectedModels.length ? this.selectedModels.join(', ') : 'none';
    return html`
    <div id="bottombar">
      <div id="state">
        <div> selected model(s):
          <span class=${modelClasses}> ${modelsStr} </span>
        </div>
        <div> selected dataset(s):
          <span class="info"> ${this.selectedDataset} </span>
        </div>
      </div>
      <div id="buttons"> ${this.renderButtons()} </div>
    </div>
  `;
  }

  private renderButtons() {
    const cancel = () => {
      this.close();
    };

    const submit = () => {
      this.submitSettings();
      this.close();
    };

    const noModelsSelected = this.selectedModels.length === 0;
    const dataset = this.selectedDataset;
    const datasetValid = this.settingsService.isDatasetValidForModels(
        dataset, this.selectedModels);
    const submitDisabled = noModelsSelected || !datasetValid;

    let errorMessage = '';
    if (noModelsSelected) {
      errorMessage = 'No models selected';
    } else if (!datasetValid) {
      errorMessage = 'Selected models incompatible with selected dataset';
    }

    return html`
      <div id="buttons-container">
        <div id="error-message">${errorMessage}</div>
        <div id="buttons">
          <button @click=${cancel}>Cancel</button>
          <button
            class='accent'
            ?disabled=${submitDisabled}
            @click=${submit}>Submit
          </button>
        </div>
      </div>
    `;
  }

  /** Render the config main page. */
  private renderConfig() {
    const tab = this.selectedTab;
    const configLayout = tab === 'Models' ?
        this.renderModelsConfig() :
        (tab === 'Dataset' ? this.renderDatasetConfig() :
                             this.renderLayoutConfig());
    return html`
    <div id="config">
      ${configLayout}
    </div>
    `;
  }

  renderModelsConfig() {
    const availableModels = [...this.modelCheckboxValues.keys()];

    const renderModelSelect = (modelName: string) => {
      const checked = this.modelCheckboxValues.get(modelName) === true;
      // tslint:disable-next-line:no-any
      const change = (e: any) => {
        this.modelCheckboxValues.set(modelName, e.target.checked);
      };
      const classes = classMap({'config-line': true, 'selected': checked});
      return html`
        <div class=${classes}>
          <mwc-formfield label=${modelName}>
            <lit-checkbox
              class='checkbox'
              ?checked=${checked}
              @change=${change}></lit-checkbox>
          </mwc-formfield>
          ${this.renderStatus(checked, false)}
        </div>
      `;
    };
    const configListHTML = availableModels.map(name => renderModelSelect(name));
    return this.renderConfigPage('Models', MODEL_DESC, configListHTML);
  }

  renderDatasetConfig() {
    const allDatasets = Object.keys(this.appState.metadata.datasets);

    // If the currently-selected dataset is now invalid given the selected
    // models then search for a valid dataset to be pre-selected.
    if (!this.settingsService.isDatasetValidForModels(
            this.selectedDataset, this.selectedModels)) {
      for (let i = 0; i < allDatasets.length; i++) {
        const dataset = allDatasets[i];
        if (this.settingsService.isDatasetValidForModels(
                dataset, this.selectedModels)) {
          this.selectedDataset = dataset;
          break;
        }
      }
    }

    const renderDatasetSelect = (dataset: string) => {
      const handleDatasetChange = () => {
        this.selectedDataset = dataset;
      };

      const checked = this.selectedDataset === dataset;
      const disabled = !this.settingsService.isDatasetValidForModels(
          dataset, this.selectedModels);

      const classes = classMap(
          {'config-line': true, 'selected': checked, disabled});

      return html`
        <div class=${classes}>
          <mwc-formfield label=${dataset}>
            <mwc-radio
              name="dataset"
              class="select-dataset"
              data-dataset=${dataset}
              ?checked=${checked}
              ?disabled=${disabled}
              @change=${handleDatasetChange}>
            </mwc-radio>
          </mwc-formfield>
          ${this.renderStatus(checked, disabled)}
        </div>
      `;
    };
    const configListHTML = allDatasets.map(name => renderDatasetSelect(name));
    return this.renderConfigPage('Dataset', DATASET_DESC, configListHTML);
  }

  renderLayoutConfig() {
    const layouts = Object.keys(this.appState.layouts);
    const renderLayoutOption = (name: string) => {
      const checked = this.selectedLayout === name;
      const classes = classMap({
        'config-line': true,
        'selected': checked,
      });
      return html`
        <div class=${classes}>
          <mwc-formfield label=${name}>
            <mwc-radio
              name="layouts"
              ?checked=${checked}
              @change=${() => this.selectedLayout = name}>
            </mwc-radio>
          </mwc-formfield>
          ${this.renderStatus(checked, false)}
        </div>
      `;
    };
    const configListHTML = layouts.map(name => renderLayoutOption(name));
    return this.renderConfigPage('Layout', LAYOUT_DESC, configListHTML);
  }

  /** Render the "compatible", "selected", or "incompatible" status. */
  private renderStatus(selected = true, disabled = false) {
    const statusText = selected ?
        SELECTED_TXT :
        (disabled ? INCOMPATIBLE_TXT : COMPATIBLE_TXT);

    const statusClasses = classMap({status: true, selected});
    return html`<div class=${statusClasses}> ${statusText}</div>`;
  }

  private renderConfigPage(
      title: TabName, description: string, configListHTML: TemplateResult[]) {
    return html`
      <div class="config-title">${title}</div>
      <div class="description"> ${description} </div>
      <div class="config-list">
        ${configListHTML}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-global-settings': GlobalSettingsComponent;
  }
}
