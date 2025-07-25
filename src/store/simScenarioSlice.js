import { createSlice } from '@reduxjs/toolkit';
import { getItemByAdebisID } from './simDataSlice';

const initialState = {
  scenarios: [],
  selectedScenarioId: null,
  lastImportAnonymized: true,
  selectedItems: {},
  scenarioSaveDialogPending: false, 
};

const simScenarioSlice = createSlice({
  name: 'simScenario',
  initialState,
  reducers: {
    setSelectedScenarioId(state, action) {
      state.selectedScenarioId = String(action.payload);
    },
    setLastImportAnonymized(state, action) {
      state.lastImportAnonymized = action.payload;
    },
    setSelectedItem(state, action) {
      const scenarioId = state.selectedScenarioId;
      if (!scenarioId) return;
      state.selectedItems[scenarioId] = action.payload;
    },
    addScenario(state, action) {
      // Assign a unique id if not present
      const now = Date.now().toString();
      const scenario = {
        name: action.payload.name || 'Neues Szenario',
        remark: action.payload.remark ?? '',
        confidence: action.payload.confidence ?? 50,
        likelihood: action.payload.likelihood ?? 50,
        desirability: action.payload.desirability ?? 50,
        baseScenarioId: action.payload.baseScenarioId ?? null,
        id: action.payload.id ? String(action.payload.id) : now,
      };
      state.scenarios.push(scenario);
      state.selectedScenarioId = scenario.id; 
    },
    updateScenario(state, action) {
      const { scenarioId, updates } = action.payload; // <-- fix: use scenarioId
      const id = String(scenarioId);
      const scenario = state.scenarios.find(s => String(s.id) === id);
      if (scenario) {
        Object.assign(scenario, updates);
      }
    },
    deleteScenario(state, action) {
      const id = String(action.payload);
      // Collect all descendant scenario ids recursively
      const collectDescendants = (parentId) => {
        let ids = [parentId];
        state.scenarios.forEach(s => {
          if (s.baseScenarioId === parentId) {
            ids = ids.concat(collectDescendants(s.id));
          }
        });
        return ids;
      };
      const idsToDelete = collectDescendants(id);
      state.scenarios = state.scenarios.filter(s => !idsToDelete.includes(s.id));
      // Optionally, clear selectedScenarioId if it was deleted
      if (idsToDelete.includes(state.selectedScenarioId)) {
        state.selectedScenarioId = state.scenarios.length > 0 ? state.scenarios[0].id : null;
      }
    },
    
  },
});

// Thunk for importing a scenario and all related data
export const importScenario = ({
  scenarioSettings,
  groupDefs,
  qualiDefs,
  groupAssignments,
  qualiAssignments,
  simDataList,
  bookingsList
}) => async (dispatch, getState) => {
  // Generate unique scenario id
  const scenarioId = Date.now().toString();

  // Add scenario to scenario slice
  dispatch(addScenario({
    ...scenarioSettings,
    id: scenarioId
  }));

  // Import sim data items (do NOT attach bookings)
  if (simDataList && simDataList.length > 0) {
    dispatch({
      type: 'simData/importDataItems',
      payload: { scenarioId, simDataList }
    });
  }

  // Import bookings into simBooking
  if (bookingsList && bookingsList.length > 0) {
    // Link bookings to correct dataItem using adebisId
    const state = getState();
    const normalizedBookings = bookingsList.map(b => {
      // Find the correct dataItem by adebisId
      const dataItem = getItemByAdebisID(state, scenarioId, { id: b.kindAdebisId, source: "kind" });
      return {
        ...b,
        dataItemId: dataItem ? Object.keys(state.simData.dataByScenario[scenarioId]).find(
          key => state.simData.dataByScenario[scenarioId][key] === dataItem
        ) : undefined
      };
    }).filter(b => b.dataItemId);
    dispatch({
      type: 'simBooking/importBookings',
      payload: { scenarioId, items: normalizedBookings }
    });
  }

  // Select the new scenario
  dispatch(setSelectedScenarioId(scenarioId));
};

// Thunk: delete a scenario and all related data
export const deleteScenario = (scenarioId) => (dispatch, getState) => {
  dispatch(simScenarioSlice.actions.deleteScenario(scenarioId));
  dispatch({ type: 'simData/deleteAllDataForScenario', payload: { scenarioId } });
};

export const {
  setSelectedScenarioId,
  setLastImportAnonymized,
  setSelectedItem,
  setScenarioSaveDialogOpen,
  setScenarioSaveDialogPending,
  addScenario,
  updateScenario,
  deleteScenario: deleteScenarioReducer,
} = simScenarioSlice.actions;

export default simScenarioSlice.reducer;


