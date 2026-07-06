levels = [
    'WARNING',
    'INFO'
]

removedDependentNodeCase = 'Removed dependent node'

def importLogs(currentMap, path, name):
    try:
        with open(path + '/' + name + '.txt') as file:
            file = file.readlines()

        for line in file:
            if removedDependentNodeCase in line:
                information = line.split(maxsplit=-1)
                node = information[10]
                graph = information[11].strip('()')
                navGraph = currentMap.getNavigationGraphById(graph)
                navGraph._changedNodesLog.append({'id': node, 'moved': False})
                movedNode = information[6]
                movedNodeGraph = information[7].strip('()')
                print(line)
                print(movedNode, movedNodeGraph)
                movedNodeNavGraph = currentMap.getNavigationGraphById(movedNodeGraph)
                movedNodeNavGraph._changedNodesLog.append({'id': movedNode, 'moved': True})
    except FileNotFoundError:
        print('File could not be opened, maybe the file does not exist or is not a JSON-file.')