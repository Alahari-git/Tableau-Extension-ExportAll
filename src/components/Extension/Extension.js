import React, { useEffect } from 'react';
import ExportBtn from './ExportBtn/ExportBtn';
import { initializeMeta, revalidateMeta, saveSettings, setSettings, exportToExcel } from '../func/func';
import compareVersions from 'compare-versions';

// Declare this so our linter knows that tableau is a global object
/* global tableau */

function Extension (props) {

  useEffect(() => {
    console.log('[Extension.js] Props Changed', props);
  }, [props]);

  useEffect(() => {
    console.log('[Extension.js] useEffect');
    console.log('[Extension.js] Initialise Extension', props);
    //Initialise Extension
    tableau.extensions.initializeAsync({'configure': configure}).then(() => {

      let latestMetaVersion = 2;
      let metaVersion = tableau.extensions.settings.get('metaVersion');

      if (metaVersion) {
        console.log('[Extension.js] Meta Version', metaVersion);
        props.updateMetaVersion(metaVersion);
      } else {
        console.log('[Extension.js] Meta Version', 1);
        metaVersion = 1;
        props.updateMetaVersion(1);
      }

      let sheetSettings = tableau.extensions.settings.get('selectedSheets');

      if (sheetSettings && sheetSettings != null) {
        console.log('[Extension.js] Existing Sheet Settings String', sheetSettings);
        const existingSettings = JSON.parse(sheetSettings);
        console.log('[Extension.js] Existing Sheet Settings Parsed', JSON.stringify(existingSettings));
        if (metaVersion === 1) {
          console.log('[Extension.js] Sheet meta needs to be updated');
          revalidateMeta(existingSettings)
          .then(meta => {
            props.updateMeta(meta);
            setSettings('sheets', meta);
            props.disableButton(false);
            props.updateMetaVersion(latestMetaVersion);
            setSettings('version', latestMetaVersion);
            saveSettings();
          });
        } else {
          revalidateMeta(existingSettings)
          .then(meta => {
            props.updateMeta(meta);
            setSettings('sheets', meta);
            props.disableButton(false);
            saveSettings();
          });
        }

      } else {
        console.log('[Extension.js] Can\'t find existing sheet settings');
        initializeMeta()
          .then(meta => {
            props.updateMeta(meta);
            setSettings('sheets', meta);
            setSettings('label', 'Export All');
            return saveSettings();
          })
          .then(meta => configure(meta));
      }

      let labelSettings = tableau.extensions.settings.get('buttonLabel');

      if (labelSettings && labelSettings != null) {
        labelSettings = labelSettings.replace(/"/g,'');
        console.log('[Extension.js] initializeAsync Existing Label Settings Found', labelSettings);
        props.updateLabel(labelSettings);
      }

      let styleSettings = tableau.extensions.settings.get('buttonStyle');

      if (styleSettings && styleSettings != null) {
        console.log('[Extension.js] initializeAsync Existing Label Style Found', styleSettings);
        props.updateButtonStyle(styleSettings);
      }

      let filenameSettings = tableau.extensions.settings.get('filename');

      if (filenameSettings && filenameSettings != null) {
        console.log('[Extension.js] initializeAsync Existing Filename Found', filenameSettings);
        props.updateFilename(filenameSettings);
      }

    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshSettings() {
    let sheetSettings = tableau.extensions.settings.get('selectedSheets');

    if (sheetSettings && sheetSettings != null) {
      const existingSettings = JSON.parse(sheetSettings);
      console.log('[Extension.js] refreshSettings Existing Sheet Settings Found. Refreshing', existingSettings);
      revalidateMeta(existingSettings)
        .then(meta => {
          props.updateMeta(meta);
          props.disableButton(false);
        });
    }

    let labelSettings = tableau.extensions.settings.get('buttonLabel');

    if (labelSettings && labelSettings != null) {
      labelSettings = labelSettings.replace(/"/g,'');
      console.log('[Extension.js] refreshSettings Existing Label Settings Found', labelSettings);
      props.updateLabel(labelSettings);
    }

    let styleSettings = tableau.extensions.settings.get('buttonStyle');

    if (styleSettings && styleSettings != null) {
      console.log('[Extension.js] refreshSettings Existing Label Style Found', styleSettings);
      props.updateButtonStyle(styleSettings);
    }

    let filenameSettings = tableau.extensions.settings.get('filename');

    if (filenameSettings && filenameSettings != null) {
      console.log('[Extension.js] refreshSettings Existing Filename Found', filenameSettings);
      props.updateFilename(filenameSettings);
    }
  }

  function configure () {
    console.log('[Extension.js] Opening configure popup');
    const popupUrl = `${window.location.origin}/configure`;
    tableau.extensions.ui.displayDialogAsync(popupUrl, null, { height: 500, width: 500 }).then((closePayload) => {
      refreshSettings();
      console.log('[Extension.js] Config window closed', props)
    }).catch((error) => {
      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log('[Extension.js] Dialog was closed by user');
          refreshSettings();
          break;
        default:
          console.error('[Extension.js]', error.message);
      }
    });
  }

  function clickExportHandler() {
    let sheetSettings = tableau.extensions.settings.get('selectedSheets');
    const existingSettings = JSON.parse(sheetSettings);
    revalidateMeta(existingSettings)
      .then(meta => {
        if (tableau.extensions.environment.context === "server") {
          exportToExcel(meta, 'server', props.filename);
        } else {
          console.log('[Extension.js] Tableau Version', tableau.extensions.environment.tableauVersion);
          if (compareVersions.compare(tableau.extensions.environment.tableauVersion, '2019.4.0', '>=') ) {
            exportToExcel(meta, 'desktop', props.filename);
          } else {
            desktopExportHandler ();
          }
    
        }
      });
  }

  function desktopExportHandler () {
    const popupUrl = `${window.location.origin}/desktopexport`;
    tableau.extensions.ui.displayDialogAsync(popupUrl, '', { height: 350, width: 400 }).then((closePayload) => {
      console.log('[Extension.js] Export window closed')
    }).catch((error) => {
      switch(error.errorCode) {
        case tableau.ErrorCodes.DialogClosedByUser:
          console.log('[Extension.js] Export window was closed by user');
          break;
        default:
          console.error('[Extension.js]', error.message);
      }
    });
  }

  return (
    <ExportBtn label={props.label} style={props.style} disabled={props.disabled} export={clickExportHandler}></ExportBtn>
  );
}

export default Extension;
