import FreeSimpleGUI as sg

SYNAOS_COLORS = {
    'blackBlue': '#000B34',
    'trueBlue': '#0049C5',
    'petrolBlue': '#046293',
    'petrolGreen': '#00ADB4',
    'darkBlue': '#000A5A',
    'violet': '#61209D',
    'white': '#FFFFFF',
    'black': '#010A22',
    'darkGray': '#5C607A',
    'red': '#FF0000',
    'coral': '#FF534A'
}

ELEMENT_COLORS = {
            'nodeBorder': SYNAOS_COLORS['black'],
            'node': SYNAOS_COLORS['darkGray'],
            'edge': SYNAOS_COLORS['black'],
            'handlingStation': SYNAOS_COLORS['trueBlue'],
            'handlingStationBorder': SYNAOS_COLORS['black'],
            'trafficLight': SYNAOS_COLORS['violet'],
            'trafficLightBorder': SYNAOS_COLORS['black'],
            'emergencySpot': SYNAOS_COLORS['coral'],
            'chargingStation': 'orangered',
            'chargingStationBorder': SYNAOS_COLORS['black'],
            'parkingSpot': SYNAOS_COLORS['black'],
            'parkingSpotBorder': SYNAOS_COLORS['black'],
            'gate': SYNAOS_COLORS['trueBlue'],
            'entryLocation': SYNAOS_COLORS['petrolBlue'],
            'selectedObject': 'gold',
            'pointingObject': '#ff7070',
            'trajectory': SYNAOS_COLORS['trueBlue'],
            'ghost': '#ff7070',
            'neighbor': SYNAOS_COLORS['petrolGreen'],
            'neighborDependency': SYNAOS_COLORS['petrolBlue'],
            'changed': 'green',
            'moved': 'fuchsia',
        }

TOOLTIPS = {
    'importMapUpdate': 'Update active graph with import data'
}


def setSynaosDesign():
    sg.SetOptions(
        font='Calibri 11',
        auto_size_buttons=True,
        border_width=1,
        background_color=SYNAOS_COLORS['white'],
        text_element_background_color=SYNAOS_COLORS['white'],
        element_background_color=SYNAOS_COLORS['white'],
        text_color=SYNAOS_COLORS['black'],
        input_elements_background_color=SYNAOS_COLORS['white'],
        button_color=(SYNAOS_COLORS['white'], SYNAOS_COLORS['darkBlue']),
        progress_meter_color=(SYNAOS_COLORS['trueBlue'], SYNAOS_COLORS['darkBlue']),
        element_text_color=SYNAOS_COLORS['black'],
        input_text_color=SYNAOS_COLORS['black']
    )


def createLayout(canvas):
    menu = [['Project', ['Open::openProject', 'Save::saveProject', 'Exit', 'Properties']],
            ['Help', 'About...'], ]

    infoFrame = [[sg.Text('ID:', size=[6, 1]), sg.Text('-', size=[12, 1], key='infoId')],
                 [sg.Text('X:', size=[6, 1]), sg.Text('-', size=[12, 1], key='infoX')],
                 [sg.Text('Y:', size=[6, 1]), sg.Text('-', size=[12, 1], key='infoY')],
                 [sg.Text('Length:', size=[6, 1]), sg.Text('-', size=[12, 1], key='infoLength')]]

    map_editing_tools_tab = [
        [sg.Combo(values=[], size=(28, 4), key='activeGraphMap', auto_size_text=False, readonly=True, enable_events=True)],
        [sg.Button('Add Graph', size=[12, 1], key='addGraph'),
         sg.Button('Remove Graph', size=[12, 1], key='removeGraph')],
        [sg.Button('Open', size=[12, 1], key='mapOpen'), sg.Button('Save', size=[12, 1], key='mapSave')],
        [sg.Button('Edit', size=[12, 1], key='mapEdit'),
         sg.Button('Merge', size=[12, 1], key='mapMerge')]
    ]

    graph_editing_tools_tab = [
        [sg.Combo(values=[], size=(28, 4), key='activeGraph', auto_size_text=False, readonly=True, enable_events=True)],
        [sg.Button('Lock Nodes', size=[12, 1], key='lockNodes'),
         sg.Button('Node List', size=[12, 1], key='nodeList')],
        [sg.Button('Dependencies', size=[12, 1], key='dependenciesMode'),
         sg.Button('AGV Types', size=[12, 1], key='agvTypes')],
        [sg.Button('Edit', size=[12, 1], key='graphEdit'),
         sg.Button('Reset View', size=[12, 1], key='resetView')]
    ]

    periphery_editing_tools_tab = [
        [sg.Button('Stations', size=[12, 1], key='stations'),
         sg.Button('Groups', size=[12, 1], key='groups')],
        [sg.Button('Traffic Lights', size=[12, 1], key='lights'),
         sg.Button('Charger', size=[12, 1], key='charger')]
    ]

    buttonColumn = [[sg.Menu(menu, tearoff=False)],
                    [sg.Text('')],
                    [sg.Text('Editing Tools')],
                    [sg.TabGroup([[sg.Tab('Map', map_editing_tools_tab, pad=(0, 0), key='editMap'),
                                   sg.Tab('Graph', graph_editing_tools_tab, pad=(0, 0), key='editGraph'),
                                   sg.Tab('Periphery', periphery_editing_tools_tab, pad=(0, 0), key='editPeriphery')]])],
                    [sg.Text('')],
                    [sg.Text('Import external Map')],
                    [sg.Button('As map', size=[12, 1], key='mapImportAsMap'), sg.Button('As graph', size=[12, 1], key='mapImportAsGraphs')],
                    [sg.Button('Update', size=[12, 1], key='mapImportUpdateCurrent', tooltip=TOOLTIPS['importMapUpdate']), sg.Button('Import Logs', size=[12, 1], key='importChanges')],
                    [sg.Text('')],
                    [sg.Text('Background')],
                    [sg.Button('Open', size=[12, 1], key='backgroundOpen'), sg.Button('Save', size=[12, 1], key='backgroundSave')],
                    [sg.Button('Edit', size=[12, 1], key='backgroundEdit'), sg.Button('Delete', size=[12, 1], key='backgroundDelete')],
                    [sg.Text('')],
                    [sg.Frame('Information', infoFrame)],
                    [sg.Text('')],
                    [sg.Button('Options', size=[12, 1], key='options'), sg.Button('LOG-Structure', size=[12, 1], key='logstructer')]]

    layout = [[canvas, sg.VerticalSeparator(), sg.Column(buttonColumn)]]
    return layout
