import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Slider, Accordion, AccordionSummary, AccordionDetails, List, ListItemButton, ListItemText, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSelector, useDispatch } from 'react-redux';
import { updateScenario, deleteScenario } from '../../store/simScenarioSlice';

// Recursive component for rendering individual scenarios in the dialog
function ScenarioTreeItem({ scenario, selectedId, onSelect, expandedMap, setExpandedMap, level = 0 }) {
    const hasChildren = scenario.children && scenario.children.length > 0;
    const expanded = expandedMap[scenario.id] ?? true;
    const isSelected = selectedId === scenario.id;

    return (
        <React.Fragment>
            <ListItemButton
                selected={isSelected}
                onClick={() => onSelect(scenario)}
                sx={{ pl: 2 + level * 2 }}
            >
                {hasChildren && (
                    <IconButton
                        size="small"
                        onClick={e => {
                            e.stopPropagation();
                            setExpandedMap(map => ({ ...map, [scenario.id]: !expanded }));
                        }}
                        sx={{ mr: 1 }}
                    >
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                )}
                {!hasChildren && <Box sx={{ width: 32, display: 'inline-block' }} />}
                <ListItemText primary={scenario.name} />
            </ListItemButton>
            {hasChildren && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    {scenario.children.map(child => (
                        <ScenarioTreeItem
                            key={child.id}
                            scenario={child}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            expandedMap={expandedMap}
                            setExpandedMap={setExpandedMap}
                            level={level + 1}
                        />
                    ))}
                </Collapse>
            )}
        </React.Fragment>
    );
}

function ScenarioDialog({ scenarioId, isNew, mode = 'edit', onClose }) {
    const dispatch = useDispatch();
    const scenarios = useSelector(state => state.simScenario.scenarios);
    const scenario = scenarioId ? scenarios.find(s => s.id === scenarioId) : null;

    const [form, setForm] = useState(() => ({
        name: scenario?.name || '',
        remark: scenario?.remark || '',
        confidence: scenario?.confidence !== undefined ? Number(scenario.confidence) : 50,
        likelihood: scenario?.likelihood !== undefined ? Number(scenario.likelihood) : 50,
        desirability: scenario?.desirability !== undefined ? Number(scenario.desirability) : 50,
        baseScenarioId: scenario?.baseScenarioId || ''
    }));

    useEffect(() => {
        setForm({
            name: scenario?.name || '',
            remark: scenario?.remark || '',
            confidence: scenario?.confidence !== undefined ? Number(scenario.confidence) : 50,
            likelihood: scenario?.likelihood !== undefined ? Number(scenario.likelihood) : 50,
            desirability: scenario?.desirability !== undefined ? Number(scenario.desirability) : 50,
            baseScenarioId: scenario?.baseScenarioId || ''
        });
    }, [scenarioId, scenario]);

    // Build scenario tree for nested list, excluding the current scenario itself
    const scenarioTree = useMemo(() => {
        if (!scenario) return [];
        const filtered = scenarios.filter(s => s.id !== scenario.id);
        // buildScenarioTree logic inline
        const map = {};
        filtered.forEach(s => { map[s.id] = { ...s, children: [] }; });
        const roots = [];
        filtered.forEach(s => {
            if (s.baseScenarioId && map[s.baseScenarioId]) {
                map[s.baseScenarioId].children.push(map[s.id]);
            } else {
                roots.push(map[s.id]);
            }
        });
        return roots;
    }, [scenarios, scenario]);
    const [treeExpandedMap, setTreeExpandedMap] = useState({});
    const [baseScenarioAccordionOpen, setBaseScenarioAccordionOpen] = useState(false);

    const handleChange = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
    };

    const handleSave = () => {
        if (scenario) {
            dispatch(updateScenario({ scenarioId: scenario.id, updates: { ...form } }));
        }
        onClose?.();
    };

    const handleCancel = () => {
        if (isNew && scenario) {
            dispatch(deleteScenario(scenario.id));
        }
        onClose?.();
    };

    // Find all descendant scenario IDs (recursive)
    const collectDescendants = (id, allScenarios) => {
        let ids = [id];
        allScenarios.forEach(s => {
            if (s.baseScenarioId === id) {
                ids = ids.concat(collectDescendants(s.id, allScenarios));
            }
        });
        return ids;
    };

    const handleDeleteConfirmed = () => {
        if (!scenario) return;
        dispatch(deleteScenario(scenario.id));
        onClose?.();
    };

    // Nested scenario selection for base scenario
    const handleBaseScenarioSelect = (selected) => {
        handleChange('baseScenarioId', selected ? selected.id : '');
        setBaseScenarioAccordionOpen(false);
    };

    // Delete dialog mode
    if (mode === 'delete') {
        if (!scenario) return null;
        const descendants = collectDescendants(scenario.id, scenarios);
        return (
            <Dialog open={!!scenario} onClose={onClose}>
                <DialogTitle>Szenario löschen</DialogTitle>
                <DialogContent>
                    <Typography>
                        Diese Aktion löscht das Szenario &quot;{scenario.name}&quot;
                        {descendants.length > 1 && (
                            <> und {descendants.length - 1} abhängige Szenario(s)</>
                        )}
                        . Dieser Vorgang kann nicht rückgängig gemacht werden.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Abbrechen</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteConfirmed}
                    >
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // Edit/add dialog mode
    return (
        <Dialog open={!!scenario} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Szenario bearbeiten</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Szenarioname"
                        value={form.name}
                        onChange={e => handleChange('name', e.target.value)}
                        fullWidth
                        autoFocus
                        size="small"
                    />
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Basis-Szenario
                        </Typography>
                        <Accordion
                            expanded={baseScenarioAccordionOpen}
                            onChange={() => setBaseScenarioAccordionOpen(open => !open)}
                            sx={{ mb: 1, boxShadow: 'none', border: '1px solid #eee' }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="base-scenario-content"
                                id="base-scenario-header"
                                sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0, alignItems: 'center' } }}
                            >
                                <Typography sx={{ flex: 1 }}>
                                    {form.baseScenarioId
                                        ? (scenarios.find(s => s.id === form.baseScenarioId)?.name || 'Unbekannt')
                                        : 'Keines'}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <List dense disablePadding>
                                    <ListItemButton
                                        selected={!form.baseScenarioId}
                                        onClick={() => handleBaseScenarioSelect(null)}
                                        sx={{ pl: 4 }}
                                    >
                                        <ListItemText primary="Keines" />
                                    </ListItemButton>
                                    {scenarioTree.map(scenario => (
                                        <ScenarioTreeItem
                                            key={scenario.id}
                                            scenario={scenario}
                                            selectedId={form.baseScenarioId}
                                            onSelect={handleBaseScenarioSelect}
                                            expandedMap={treeExpandedMap}
                                            setExpandedMap={setTreeExpandedMap}
                                        />
                                    ))}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                    <TextField
                        label="Bemerkung"
                        value={form.remark}
                        onChange={e => handleChange('remark', e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={4}
                        size="small"
                    />
                    <Box>
                        <Typography gutterBottom>Wahrscheinlichkeit: {form.likelihood}%</Typography>
                        <Slider
                            value={Number(form.likelihood)}
                            min={0}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            onChange={(_, val) => handleChange('likelihood', val)}
                            sx={{ mt: 0, mb: 1 }}
                        />
                    </Box>
                    <Box>
                        <Typography gutterBottom>Gewünschtheit: {form.desirability}%</Typography>
                        <Slider
                            value={Number(form.desirability)}
                            min={0}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            onChange={(_, val) => handleChange('desirability', val)}
                            sx={{ mt: 0, mb: 1 }}
                        />
                    </Box>
                    <Box>
                        <Typography gutterBottom>Belastbarkeit: {form.confidence}%</Typography>
                        <Slider
                            value={Number(form.confidence)}
                            min={0}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            onChange={(_, val) => handleChange('confidence', val)}
                            sx={{ mt: 0, mb: 1 }}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                {!isNew && (
                    <Button onClick={onClose}>Schließen</Button>
                )}
                {isNew && (
                    <Button onClick={handleCancel}>Abbrechen</Button>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                >
                    Speichern
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ScenarioDialog;
