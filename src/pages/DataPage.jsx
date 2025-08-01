import React, { useState } from 'react';
import {
  Box,
  SpeedDial,
  SpeedDialAction,
  Paper,
  SpeedDialIcon,
  Typography,
  Button, 
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DataImportModal from '../components/modals/DataImportModal';
import SimDataList from '../components/SimDataDetail/SimDataList';
import SimDataDetailForm from '../components/SimDataDetail/SimDataDetailForm';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedScenarioId, addScenario, isSaveAllowed, setSaveDialogOpen, setLoadDialogOpen } from '../store/simScenarioSlice';
import { addDataItemAndSelect } from '../store/simDataSlice';
import ScenarioSaveDialog from '../components/modals/ScenarioSaveDialog';
import ScenarioLoadDialog from '../components/modals/ScenarioLoadDialog';
import PersonIcon from '@mui/icons-material/Person';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import LayersIcon from '@mui/icons-material/Layers';
import { useScenarioImport } from '../hooks/useScenarioImport';
import { useOverlayData } from '../hooks/useOverlayData';

function DataPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const dispatch = useDispatch();
  const isSaveAllowedValue = useSelector(isSaveAllowed);
  const selectedScenarioId = useSelector(state => state.simScenario.selectedScenarioId);
  const scenarios = useSelector(state => state.simScenario.scenarios);
  const selectedItemId = useSelector(state => state.simScenario.selectedItems?.[selectedScenarioId]);
  
  // Use overlay hook to get effective data
  const { getEffectiveDataItems, getEffectiveDataItem } = useOverlayData();
  const effectiveDataItems = getEffectiveDataItems();
  const selectedItem = getEffectiveDataItem(selectedItemId);
  
  // Convert effective data items to array for checking length
  const simulationData = Object.values(effectiveDataItems || {});

  const { importScenario } = useScenarioImport();

  const handleImport = async ({ file, isAnonymized }) => {
    await importScenario({ file, isAnonymized });
    setModalOpen(false);
  };

  const handleLoadDone = () => {
    // Dialog will be closed by the component itself
  };

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const actions = [
    {
      icon: <PersonIcon />,
      name: 'Kapazität',
      onClick: () => dispatch(addDataItemAndSelect({ scenarioId: selectedScenarioId, item: { type: "capacity", source: "manual entry" } }))
    },
    {
      icon: <ChildCareIcon />,
      name: 'Bedarf',
      onClick: () => dispatch(addDataItemAndSelect({ scenarioId: selectedScenarioId, item: { type: "demand", source: "manual entry" } }))
    },
    {
      icon: <LayersIcon />,
      name: 'Szenario',
      onClick: () => {
        dispatch(addScenario({
          name: 'Neues Szenario',
          remark: '',
          confidence: 50,
          likelihood: 50,
          baseScenarioId: selectedScenarioId || null
        }));
      }
    },
    {
      icon: <FileUploadIcon />,
      name: 'Import',
      onClick: handleOpenModal
    },
    {
      icon: <SaveIcon />,
      name: 'Speichern',
      onClick: () => dispatch(setSaveDialogOpen(true)),
      disabled: !isSaveAllowedValue
    },
    {
      icon: <FolderOpenIcon />,
      name: 'Laden',
      onClick: () => dispatch(setLoadDialogOpen(true))
    }
  ];

  // Check if selected scenario still exists, if not select the first available one
  React.useEffect(() => {
    if (selectedScenarioId && scenarios.length > 0) {
      const scenarioExists = scenarios.some(s => s.id === selectedScenarioId);
      if (!scenarioExists) {
        // Selected scenario was deleted, select the first available one
        dispatch(setSelectedScenarioId(scenarios[0].id));
      }
    } else if (!selectedScenarioId && scenarios.length > 0) {
      // No scenario selected but scenarios exist, select the first one
      dispatch(setSelectedScenarioId(scenarios[0].id));
    }
  }, [selectedScenarioId, scenarios, dispatch]);

  // Show notice if no scenario exists
  if (!scenarios || scenarios.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f0f2f5' }}>
        <Paper
          sx={{
            m: 'auto',
            p: 4,
            textAlign: 'center',
            bgcolor: '#f5f5f5',
            border: '2px dashed #ccc',
            maxWidth: 480
          }}
        >
          <Typography variant="h6" gutterBottom>
            Kein Szenario vorhanden
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Um mit der Simulation zu starten, importieren Sie bitte zuerst Daten.
          </Typography>
          <Button
            variant="contained"
            startIcon={<FileUploadIcon />}
            onClick={() => setModalOpen(true)}
            size="large"
          >
            Daten importieren
          </Button>
        </Paper>
        <DataImportModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onImport={handleImport}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <SpeedDial
        ariaLabel="SpeedDial for data actions"
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
        icon={<SpeedDialIcon />}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
            disabled={action.disabled}
          />
        ))}
      </SpeedDial>
      <DataImportModal
        open={modalOpen}
        onClose={handleCloseModal}
        onImport={handleImport}
      />
      <ScenarioSaveDialog />
      <ScenarioLoadDialog onLoaded={handleLoadDone} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', pt: 0 }}>
        <>
          <Box sx={{ width: 320, flexShrink: 0, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {simulationData.length === 0 && (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  fullWidth
                  onClick={handleOpenModal}
                >
                  Importieren
                </Button>
              </Box>
            )}
            <SimDataList/>
          </Box>
          <Box sx={{ flex: 1, p: 3, overflow: 'auto', height: '100vh', maxHeight: '100vh' }}>
            {simulationData.length > 0 && selectedItem && (
              <SimDataDetailForm/>
            )}
          </Box>
        </>
      </Box>
    </Box>
  );
}

export default DataPage;