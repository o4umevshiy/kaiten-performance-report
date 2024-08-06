const express = require('express');
const app = express();
const axios = require('axios');
const ExcelJS = require('exceljs');
const Bottleneck = require("bottleneck");
const opn = require('opn');
const cors = require('cors');

app.use(express.json());
app.use(cors());

const limiter = new Bottleneck({
    maxConcurrent: 4.9,
    minTime: 250,
});


// -- [ Middleware ] --
// Get Token
const getToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Нет токена' });
    }

    req.token = authHeader.split(' ')[1];
    next();
};

// Use
app.use('/api', getToken);


// -- [ Main ] --
// Your Api Url
// For example: https://example.kaiten.ru/api/latest
const ApiUrl = '';

// User Data
app.get('/api/user', (req, res) => {
    const token = req.token;

    if( allSpaces ){
        allSpaces = [];
    }

    (async () => {
        try {
            const respData = await fetchData(token, ApiUrl + '/users/current')

            await res.send({
                success: true,
                response : respData
            });
        }catch (error) {
            console.log( 'Error in api/user:' );
            console.log( error );
            res.send({
                success: false,
                response : error
            });
        }
    })();
});

// Spaces
let allSpaces = [];
app.get('/api/spaces', async (req, res) => {
    const token = req.token;

    try {
        if( allSpaces.length < 1 ){
            allSpaces = await fetchData( token, ApiUrl + '/spaces' );
        }

        res.send({
            success: true,
            spaces : allSpaces
        });
    }catch (error){
        console.log( 'Error in api/spaces:' );
        console.log( error );
        res.send({
            success: false,
            response: error.message || error
        });
    }
});

let savedReports = { up : '', res : '', eBoardsIdUp   : '', eBoardsIdDown : '', startDate : '', endDate : '', form : '' };
app.post('/api/report', async (req, res) => {
    const token = req.token;
    const form = req.body.form;
    const upSpace = req.body.up;
    const downSpace = req.body.down;
    const startDate = req.body.start;
    const endDate = req.body.end;
    const archived = req.body.archived === true ? '' : '&archived=false';
    const eBoardsIdUp = req.body.eBoardsIdUp.length ? ('&exclude_board_ids=' + req.body.eBoardsIdUp.join(',')) : '';
    const eBoardsIdDown = (req.body.eBoardsIdDown && req.body.eBoardsIdDown.length) ? ('&exclude_board_ids=' + req.body.eBoardsIdDown.join(',')) : '';

    const collectXLSX = async ( report ) => {
        let checkEmpty = false;
        for( let space of report.coincide ){
            if( space.list.length ){
                checkEmpty = true;
                break;
            }
        }
        for( let space of report.nCoincide ){
            if( space.list.length ){
                checkEmpty = true;
                break;
            }
        }
        if( report.upCoincide && report.upCoincide.length ){
            checkEmpty = true;
        }
        if( checkEmpty === false ){
            return res.status(400).send({
                success: false,
                response: 'По указанным параметрам ничего не найдено'
            });
        }else{
            const borderStyle = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            const emptyCells = {
                top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            };

            const workbook = new ExcelJS.Workbook();

            if( form === 0 ){
                let widths = [ 12, 30, 12, 30, 16, 20, 20, 20, 16, 16, 12, 14, 8, 30, 16, 12, 12, 12 ];
                report.coincide.forEach((space) => {
                    if (space.list.length > 0) {
                        let worksheet = workbook.addWorksheet('Совпавшие"' + downSpace.find(item => item.id === space.id).title + '"(' + space.list.length + 'шт)');
                        let headerRow = worksheet.addRow([
                            "id задачи",
                            "Задача",
                            "id верхней задачи",
                            "Название верхней задачи",
                            "Дивизион верхней задачи",
                            "Пространство верхней задачи",
                            "Доска верхней задачи",
                            "Дорожка верхней задачи",
                            "Тип задачи",
                            "Пространство",
                            "Доска", "Дорожка", "Размер", "Ответственный", "id ответственного", "Срок (deadline)", "Дата создания",
                            "Дата вполнения"]);

                        headerRow.height = 30;
                        headerRow.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFEBF4FF' },
                            };
                            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        });

                        space.list.forEach((card, cardIdx) => {
                            let row = [
                                card.id,
                                card.title,
                                card.upId,
                                card.upTitle,
                                card.upDivision, upSpace.title,
                                card.upBoard, card.upPath.lane.title,
                                card.type, card.space,
                                card.board, card.lane, card.size,
                                card.responsible ? card.responsible.name : null,
                                card.responsible ? card.responsible.id : null,
                                card.dueDate,
                                card.created,
                                card.doneDate
                            ].map( item => {
                                if( item ){
                                    if( typeof item !== 'string' ){
                                        return item.toString()
                                    }else{
                                        return item;
                                    }
                                }else{
                                    return '—'
                                }
                            });
                            let addedRow = worksheet.addRow(row);
                            addedRow.getCell(1).value = {
                                text: card.archived === true ? card.id.toString() + '\n[В архиве]' : card.id.toString(),
                                hyperlink: 'https://softworks.kaiten.ru/space/' + card.spaceId + '/card/' + card.id
                            };
                            addedRow.getCell(1).style = { font: { color: { argb: 'FF0000FF' }, underline: true } };
                            addedRow.getCell(3).value = {
                                text: card.upArchived === true ? card.upId.toString() + '\n[В архиве]' : card.upId.toString(),
                                hyperlink: 'https://softworks.kaiten.ru/space/' + upSpace.id + '/card/' + card.upId
                            };
                            addedRow.getCell(3).style = { font: { color: { argb: 'FF0000FF' }, underline: true } };

                            if (cardIdx % 2 === 0) {
                                addedRow.eachCell((cell) => {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFF1EAFF' },
                                    };
                                });

                                for(let i = 3; i <= 8; i++) {
                                    addedRow.getCell(i).fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFEADEEE' },
                                    };
                                }
                            }else if( card.archived === true ){
                                addedRow.eachCell((cell) => {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFE9E5DE' },
                                    };
                                });

                                for(let i = 3; i <= 8; i++) {
                                    addedRow.getCell(i).fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFE1DAD0' },
                                    };
                                }
                            }else{
                                for(let i = 3; i <= 8; i++) {
                                    addedRow.getCell(i).fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFF6F1EE' },
                                    };
                                }
                            }
                        });

                        for( let i = 0; i < worksheet.columns.length; i++ ){
                            worksheet.columns[i].width = widths[i];
                            let column = worksheet.columns[i];
                            column.eachCell({ includeEmpty: true }, cell => {
                                cell.alignment = { vertical: 'middle', wrapText: true };
                                cell.border = borderStyle;
                            });
                        }
                    }
                });

                widths = [ 12, 30, 16, 16, 16, 12, 14, 30, 12, 16, 12, 12, 12 ];
                report.nCoincide.forEach((space) => {
                    if (space.list.length > 0) {
                        let worksheet = workbook.addWorksheet('Без родительских карт "' + downSpace.find(item => item.id === space.id).title + '"(' + space.list.length + 'шт)');

                        let headerRow = worksheet.addRow([
                            "id задачи",
                            "Задача", "Info", "Тип задачи",
                            "Пространство", "Доска", "Дорожка",
                            "Размер", "Ответственный", "id ответственного",
                            "Срок (deadline)", "Дата создания", "Дата вполнения"
                        ]);

                        headerRow.height = 30;
                        headerRow.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFEBF4FF' },
                            };
                            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        });

                        space.list.forEach((card, cardIdx) => {
                            let row = [
                                card.id,
                                card.title, 'Нет родителя', card.type,
                                card.space, card.board, card.lane, card.size,
                                card.responsible ? card.responsible.name : null,
                                card.responsible ? card.responsible.id : null,
                                card.dueDate, card.created, card.doneDate
                            ].map( item => {
                                if( item ){
                                    if( typeof item !== 'string' ){
                                        return item.toString()
                                    }else{
                                        return item;
                                    }
                                }else{
                                    return '—'
                                }
                            });

                            let addedRow = worksheet.addRow(row);
                            addedRow.getCell(1).value = { text: card.id.toString(), hyperlink: 'https://softworks.kaiten.ru/space/' + card.spaceId + '/card/' + card.id  };
                            addedRow.getCell(1).style = { font: { color: { argb: 'FF0000FF' }, underline: true } };

                            if (cardIdx % 2 === 0) {
                                addedRow.eachCell((cell) => {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFF1EAFF' },
                                    };
                                });
                            }
                        });

                        for( let i = 0; i < worksheet.columns.length; i++ ){
                            worksheet.columns[i].width = widths[i];
                            let column = worksheet.columns[i];
                            column.eachCell({ includeEmpty: true }, cell => {
                                cell.alignment = { vertical: 'middle', wrapText: true };
                                cell.border = borderStyle;
                            });
                        }
                    }
                });

                widths = [ 12, 30, 16, 20, 20, 20, 16, 16, 12, 14, 8, 30, 16, 12, 12, 12 ];
                if( report.upCoincide.length ){
                    let worksheet = workbook.addWorksheet('Задачи с верхнеуровненого пространства' + report.upCoincide.length + 'шт)');

                    let headerRow = worksheet.addRow([
                        "id задачи",
                        "Задача",
                        "Дивизион",
                        "Пространство",
                        "Доска",
                        "Дорожка",
                        "Тип задачи",
                        "Пространство",
                        "Доска", "Дорожка", "Размер", "Ответственный", "id ответственного", "Срок (deadline)", "Дата создания",
                        "Дата вполнения"
                    ]);

                    headerRow.height = 30;
                    headerRow.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFEBF4FF' },
                        };
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    });

                    report.upCoincide.forEach((card, cardIdx) => {
                        let row = [
                            card.id,
                            card.title,
                            card.upDivision,
                            card.path_data.space.title,
                            card.path_data.board.title,
                            card.path_data.lane.title,
                            card.type.name,
                            card.path_data.space.title,
                            card.path_data.board.title,
                            card.path_data.lane.title,
                            (card.size || '-'),
                            card.responsible ? card.responsible.name : '-',
                            card.responsible ? card.responsible.id : '-',
                            card.dueDate || '-',
                            card.created || '-',
                            card.last_moved_to_done_at || '-'
                        ].map( item => {
                            if( item ){
                                if( typeof item !== 'string' ){
                                    return item.toString()
                                }else{
                                    return item;
                                }
                            }else{
                                return '—'
                            }
                        });

                        let addedRow = worksheet.addRow(row);
                        addedRow.getCell(1).value = {
                            text: card.archived === true ? card.id.toString() + '\n[В архиве]' : card.id.toString(),
                            hyperlink: 'https://softworks.kaiten.ru/space/' + card.spaceId + '/card/' + card.id
                        };
                        addedRow.getCell(1).style = { font: { color: { argb: 'FF0000FF' }, underline: true } };

                        if (cardIdx % 2 === 0) {
                            addedRow.eachCell((cell) => {
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: 'FFF1EAFF' },
                                };
                            });
                        }

                        for( let i = 0; i < worksheet.columns.length; i++ ){
                            worksheet.columns[i].width = widths[i];
                            let column = worksheet.columns[i];
                            column.eachCell({ includeEmpty: true }, cell => {
                                cell.alignment = { vertical: 'middle', wrapText: true };
                                cell.border = borderStyle;
                            });
                        }
                    });
                }
            }else if( form === 1 ){
                let widths = [ 12, 30, 16, 20, 20, 20, 12, 30, 16, 12, 14, 16, 8, 30, 16, 12, 12, 12 ];
                report.coincide.forEach((space) => {
                    if (space.list.length > 0) {
                        let worksheet = workbook.addWorksheet(upSpace.title + '"(' + space.list.length + 'шт)');
                        let headerRow = worksheet.addRow([
                            "id верхней задачи",
                            "Название верхней задачи",
                            "Дивизион верхней задачи",
                            "Пространство верхней задачи",
                            "Доска верхней задачи",
                            "Дорожка верхней задачи",
                            "id задачи",
                            "Задача",
                            "Пространство",
                            "Доска",
                            "Дорожка",
                            "Тип задачи",
                            "Размер",
                            "Ответственный",
                            "id ответственного",
                            "Срок (deadline)",
                            "Дата создания",
                            "Дата вполнения"]);

                        headerRow.height = 40;
                        headerRow.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFEBF4FF' },
                            };
                            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                            cell.border = borderStyle;
                        });

                        let listRows = [];
                        let rowIdx = 0;
                        let sepIdxs = [];
                        space.list.forEach((card, cardIdx) => {
                            if( card.id === card.upId ){
                                if( cardIdx > 0 ){
                                    sepIdxs.push( rowIdx );
                                    rowIdx++;
                                    listRows.push({
                                        type : 0,
                                        row : ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
                                        card : card
                                    });
                                }

                                rowIdx++;
                                listRows.push({
                                    type : 1,
                                    row : [
                                        card.upId,
                                        card.upTitle,
                                        card.upDivision,
                                        upSpace.title,
                                        card.upBoard,
                                        card.upPath.lane.title,
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        card.type,
                                        card.size,
                                        card.responsible ? card.responsible.name : null,
                                        card.responsible ? card.responsible.id : null,
                                        card.dueDate,
                                        card.created,
                                        card.doneDate
                                    ],
                                    card : card
                                });
                            }else{
                                rowIdx++;
                                listRows.push({
                                    type : 3,
                                    row : [
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        card.id,
                                        card.title,
                                        card.space,
                                        card.board,
                                        card.lane,
                                        card.type,
                                        card.size,
                                        card.responsible ? card.responsible.name : null,
                                        card.responsible ? card.responsible.id : null,
                                        card.dueDate,
                                        card.created,
                                        card.doneDate
                                    ],
                                    card : card
                                });
                            }
                        });

                        listRows.forEach( (item, itemIdx) => {
                            item.row = item.row.map( item => {
                                if( item ){
                                    if( typeof item !== 'string' ){
                                        return item.toString()
                                    }else{
                                        return item;
                                    }
                                }else{
                                    return item === '' ? '' : '—'
                                }
                            });
                            let addedRow = worksheet.addRow( item.row );

                            if( item.card.id === item.card.upId ){
                                if( !sepIdxs.includes(itemIdx) ) {
                                    addedRow.getCell(1).value = {
                                        text: item.card.archived === true ? item.card.upId.toString() + '\n[В архиве]' : item.card.upId.toString(),
                                        hyperlink: 'https://softworks.kaiten.ru/space/' + upSpace.id + '/card/' + item.card.upId
                                    };
                                    addedRow.getCell(1).style = {font: {color: {argb: 'FF0000FF'}, underline: true}};
                                }
                            }else{
                                if( !sepIdxs.includes(itemIdx) ){
                                    addedRow.getCell(7).value = {
                                        text: item.card.archived === true ? item.card.id.toString() + '\n[В архиве]' : item.card.id.toString(),
                                        hyperlink: 'https://softworks.kaiten.ru/space/' + item.card.spaceId + '/card/' + item.card.id
                                    };
                                    addedRow.getCell(7).style = { font: { color: { argb: 'FF0000FF' }, underline: true } };
                                }
                            }

                            switch ( true ) {
                                case sepIdxs.includes(itemIdx) :
                                    addedRow.eachCell({ includeEmpty: true }, (cell) => {
                                        cell.alignment = { vertical: 'middle', wrapText: true };
                                        cell.border = emptyCells;
                                    });

                                    break;
                                case item.type === 1 :
                                    addedRow.eachCell({ includeEmpty: true }, (cell) => {
                                        cell.fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFCDBBC8' },
                                        };
                                        cell.alignment = { vertical: 'middle', wrapText: true };
                                        cell.border = borderStyle;
                                    });
                                    for(let i = 1; i <= 6; i++) {
                                        addedRow.getCell(i).fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFC5AEAE' }, //#c8b4bc
                                        };
                                    }
                                    break;
                                case (item.card.archived === true) :
                                    addedRow.eachCell({ includeEmpty: true }, (cell) => {
                                        cell.fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFE9E5DE' },
                                        };
                                        cell.alignment = { vertical: 'middle', wrapText: true };
                                        cell.border = borderStyle;
                                    });

                                    for(let i = 1; i <= 5; i++) {
                                        addedRow.getCell(i).fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFE1DAD0' },
                                        };
                                    }
                                    break;
                                case (itemIdx % 2 === 0) :
                                    addedRow.eachCell({ includeEmpty: true }, (cell) => {
                                        cell.fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFF1EAFF' },
                                        };
                                        cell.alignment = { vertical: 'middle', wrapText: true };
                                        cell.border = borderStyle;
                                    });

                                    for(let i = 1; i <= 6; i++) {
                                        addedRow.getCell(i).fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFEADEEE' },
                                        };
                                    }
                                    break;
                                default:
                                    addedRow.eachCell({ includeEmpty: true }, (cell) => {
                                        cell.fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFF6F1EE' },
                                        };
                                        cell.alignment = { vertical: 'middle', wrapText: true };
                                        cell.border = borderStyle;
                                    });
                                    break;
                            }
                        });

                        for (let i = 0; i < worksheet.columns.length; i++) {
                            worksheet.columns[i].width = widths[i];
                        }
                    }
                });
            }

            try {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");

                await workbook.xlsx.write(res);
            } catch (error) {
                console.log('Ошибка : ');
                console.log(error);
            }

            return res.end();
        }
    };

    if( savedReports.eBoardsIdUp === eBoardsIdUp &&
        savedReports.eBoardsIdDown === eBoardsIdDown &&
        savedReports.startDate === startDate &&
        savedReports.endDate === endDate &&
        savedReports.form === form &&
        savedReports.up.id === upSpace.id){
        if( req.body.type === 'page' ){
            return res.send( savedReports.res );
        }else if( req.body.type === 'file' ){
            await collectXLSX( savedReports.res );
        }
    }

    let coincide = [];
    let nCoincide = [];
    let upCoincide = [];

    const fetchAllCards = async ( down ) => {
        let offset = 0;
        let fetchMore = true;
        let respData = [];

        while (fetchMore) {
            try {
                const cards = await fetchData( token, ApiUrl + '/cards?space_id=' + down +
                    archived + eBoardsIdDown +
                    '&states=3&last_moved_to_done_at_after='  + startDate +
                    '&last_moved_to_done_at_before=' + endDate +
                    '&offset=' + offset );

                respData = respData.concat(cards);

                if( cards.length && (cards.length % 100 === 0) ){
                    offset = respData.length
                }else{
                    fetchMore = false;
                }
            } catch (error) {
                console.log('Error in fetchAllCards');
                console.log(error.message || error);
                return error.message || error
            }
        }

        return respData;
    }

    const fetchAllUpLvlCards = async( filterList ) => {
        let offset = 0;
        let fetchMore = true;
        let respData = [];

        while (fetchMore) {
            try {
                const cards = await fetchData( token, ApiUrl + '/cards?space_id=' + upSpace.id +
                    (filterList || '') +
                    eBoardsIdUp +
                    '&offset=' + offset );

                respData = respData.concat(cards);

                if( cards.length && (cards.length % 100 === 0) ){
                    offset = respData.length
                }else{
                    fetchMore = false;
                }
            } catch (error) {
                console.log( 'Error in fetchAllUpLvlCards' );
                console.log( error );
            }
        }

        return respData;
    }

    async function fetchCard(id){
        return await fetchData(token, ApiUrl + '/cards/' + id);
    }

    async function getAllDescendants(childrenIds, upLvlCard){
        if (!childrenIds || childrenIds.length === 0) {
            return;
        }
        for (const id of childrenIds) {
            try{
                console.log( 'send fetchCard: ' + id );
                const children = await fetchCard( id );
                if( typeof(children) === 'object' ){
                    children.upLvlCard = Object.assign({}, upLvlCard);
                    coincide[0].list.push(children);
                    await getAllDescendants(children.children_ids, Object.assign({}, upLvlCard));
                }
            }catch ( error ){
                console.error('Error in getAllDescendants:');
                console.error(error);
                if (error.response && error.response.status === 403) {
                    console.warn(`Карточка с ID ${id} недоступна из-за отсутствия прав доступа. Пропуск...`);
                } else {
                    console.error(`Ошибка при обработке карточки с ID ${id}:`, error);
                }
            }
        }
    }

    async function checkParents(card, upLvl) {
        if (!card.parents_ids || card.parents_ids.length === 0) {
            return null;
        }

        for (let j = 0; j < card.parents_ids.length; j++) {
            let parentId = card.parents_ids[j];

            for (let upCard of upLvl) {
                if (parentId === upCard.id) {
                    return upCard;
                }
            }

            let parentCard = await fetchCard(parentId);
            let match = await checkParents(parentCard, upLvl);

            if (match) {
                return match;
            }
        }

        return null;
    }

    if( form === 0 ){
        try {
            const upLvl= await fetchAllUpLvlCards();
            const devisions = await fetchData( token, ApiUrl + '/company/custom-properties/75278/select-values');

            // UpLvl Complete
            upCoincide = upLvl.filter( task => {
                const sD = new Date(startDate);
                const eD = new Date(endDate);
                const taskD = new Date(task.last_moved_to_done_at);

                if ( taskD ) {
                    return (
                        (task.children_count > 0 && task.size && task.size > 0) ||
                        (!task.children_count && task.size && task.size > 0) ||
                        (!task.children_count && !task.size)
                    ) &&
                    task.state === 3 &&
                    taskD >= sD && taskD <= eD;
                }

                return false;
            });
            upCoincide.forEach(task => {
                if(task.due_date) {
                    const dueDate = new Date(task.due_date);
                    task.dueDate =
                        (dueDate.getUTCDate() < 10 ? '0' + dueDate.getUTCDate() : dueDate.getUTCDate()) + "." +
                        (dueDate.getUTCMonth() + 1 < 10 ? '0' + (dueDate.getUTCMonth() + 1) : dueDate.getUTCMonth() + 1) + "." +
                        dueDate.getUTCFullYear();
                }else {
                    task.dueDate = null;
                }

                if (task.created) {
                    const createdDate = new Date(task.created);
                    task.created =
                        (createdDate.getUTCDate() < 10 ? '0' + createdDate.getUTCDate() : createdDate.getUTCDate()) + "." +
                        (createdDate.getUTCMonth() + 1 < 10 ? '0' + (createdDate.getUTCMonth() + 1) : createdDate.getUTCMonth() + 1) + "." +
                        createdDate.getUTCFullYear();
                } else {
                    task.created = null;
                }

                if (task.last_moved_to_done_at) {
                    const doneDate = new Date(task.last_moved_to_done_at);
                    task.last_moved_to_done_at =
                        (doneDate.getUTCDate() < 10 ? '0' + doneDate.getUTCDate() : doneDate.getUTCDate()) + "." +
                        (doneDate.getUTCMonth() + 1 < 10 ? '0' + (doneDate.getUTCMonth() + 1) : doneDate.getUTCMonth() + 1) + "." +
                        doneDate.getUTCFullYear();
                } else {
                    task.last_moved_to_done_at = null;
                }

                if( task.members ){
                    let respCheck = task.members.find(item => item.type === 2);
                    if( respCheck ){
                        task.responsible = {
                            id : respCheck.id,
                            name : respCheck.full_name
                        }
                    }
                }

                task.upDivision = null;
                if( task.properties && task.properties.id_75278){
                    task.upDivision = devisions.find( item => item.id === task.properties.id_75278[0] ).value
                }
            });

            // DownSpace
            const complete = [];
            for( let downIdx = 0; downIdx < downSpace.length; downIdx++ ){
                const down = downSpace[downIdx].id;

                coincide.push({
                    id : down,
                    list : []
                });
                nCoincide.push({
                    id : down,
                    list : []
                });
                complete.push({
                    id : down,
                    list : await fetchAllCards( down ),
                    promises : []
                });

                complete[downIdx].list.map(async (card) => {
                    let foundCard = 0;

                    for (let upCard of upLvl) {
                        if (card.id === upCard.id) {
                            foundCard = 1;
                            card.upLvlCard = upCard;
                            coincide[downIdx].list.push(card);
                            break;
                        }
                    }

                    if( foundCard === 0 ){
                        if (card.parents_ids && card.parents_ids.length > 0) {
                            let matchPromise = checkParents(card, upLvl);
                            complete[downIdx].promises.push(matchPromise);
                            let match = await matchPromise;

                            if (match) {
                                card.upLvlCard = match;
                                coincide[downIdx].list.push(card);
                            }
                        }else{
                            nCoincide[downIdx].list.push(card);
                        }
                    }
                });

                await Promise.all(complete[downIdx].promises);
            }

            // Filter and Sort
            let resp = [];
            for( let idx = 0; idx < coincide.length; idx++ ){
                const space = coincide[idx];

                resp.push({
                    id : space.id,
                    list : []
                })

                resp[idx].list = space.list.map(card => {
                    let devn = null;
                    if( card.upLvlCard.properties ){
                        if( card.upLvlCard.properties.id_75278 ){
                            devn = devisions.find( item => item.id === card.upLvlCard.properties.id_75278[0] ).value
                        }
                    }

                    let responsible = null;
                    if( card.members ){
                        let respCheck = card.members.find(item => item.type === 2);
                        if( respCheck ){
                            responsible = {
                                id : respCheck.id,
                                name : respCheck.full_name
                            }
                        }
                    }


                    if( card.size !== null ){
                        if( Number(card.size) === 0 ){
                            card.size = '0,1'
                        }else{
                            card.size = card.size.toString().replace(/\./g, ',');
                        }
                    }else{
                        card.size = '-';
                    }
                    return {
                        id: card.id,
                        title: card.title,
                        upId: card.upLvlCard.id,
                        upTitle: card.upLvlCard.title,
                        upPath: card.upLvlCard.path_data,
                        upDivision: devn,
                        upBoard: card.upLvlCard.board.title,
                        upArchived : card.upLvlCard.archived,
                        type: card.type.name,
                        space: card.path_data.space.title,
                        spaceId: card.path_data.space.id,
                        board: card.path_data.board.title,
                        lane: card.path_data.lane.title,
                        size: card.size,
                        responsible: responsible,
                        archived : card.archived,
                        dueDate:
                            !card.due_date ? card.due_date :
                                (new Date(card.due_date).getUTCDate() < 10 ? '0' + new Date(card.due_date).getUTCDate() : new Date(card.due_date).getUTCDate()) + "." +
                                (new Date(card.due_date).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.due_date).getUTCMonth() + 1) : new Date(card.due_date).getUTCMonth() + 1) + "." +
                                new Date(card.due_date).getUTCFullYear(),
                        created:
                            !card.created ? null :
                                (new Date(card.created).getUTCDate() < 10 ? '0' + new Date(card.created).getUTCDate() : new Date(card.created).getUTCDate()) + "." +
                                (new Date(card.created).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.created).getUTCMonth() + 1) : new Date(card.created).getUTCMonth() + 1) + "." +
                                new Date(card.created).getUTCFullYear(),
                        doneDate:
                            !card.last_moved_to_done_at ? null :
                                (new Date(card.last_moved_to_done_at).getUTCDate() < 10 ? '0' + new Date(card.last_moved_to_done_at).getUTCDate() : new Date(card.last_moved_to_done_at).getUTCDate()) + '.' +
                                (new Date(card.last_moved_to_done_at).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.last_moved_to_done_at).getUTCMonth() + 1) : new Date(card.last_moved_to_done_at).getUTCMonth() + 1) + '.' +
                                new Date(card.last_moved_to_done_at).getUTCFullYear()
                    }
                });

                let nonArchived = resp[idx].list.filter(item => !item.archived);
                let archived = resp[idx].list.filter(item => item.archived);

                let sortingFunction = (a, b) => {
                    if (a.upDivision === null) return 1;
                    if (b.upDivision === null) return -1;

                    let divisionCompare = a.upDivision.localeCompare(b.upDivision);

                    if (divisionCompare === 0) {
                        if (a.upTitle === null) return 1;
                        if (b.upTitle === null) return -1;

                        return a.upTitle.localeCompare(b.upTitle);
                    }

                    return divisionCompare;
                };

                nonArchived.sort(sortingFunction);
                archived.sort(sortingFunction);

                resp[idx].list = [...nonArchived, ...archived];
            }
            coincide = [...resp];

            resp = [];
            for( let idx = 0; idx < nCoincide.length; idx++) {
                const space = nCoincide[idx];

                resp.push({
                    id: space.id,
                    list: []
                });

                resp[idx].list = space.list.map(card => {
                    let responsible = null;
                    let respCheck = card.members ? card.members.find(item => item.type === 2) : false;
                    if (respCheck) {
                        responsible = {
                            id: respCheck.id,
                            name: respCheck.full_name
                        }
                    }

                    if( card.size !== null ){
                        if( Number(card.size) === 0 ){
                            card.size = '0,1'
                        }else{
                            card.size = card.size.toString().replace(/\./g, ',');
                        }
                    }else{
                        card.size = '-';
                    }
                    return {
                        id: card.id,
                        title: card.title,
                        type: card.type.name,
                        space: card.path_data.space.title,
                        spaceId: card.path_data.space.id,
                        board: card.path_data.board.title,
                        lane: card.path_data.lane.title,
                        size: card.size,
                        responsible: responsible,
                        archived : card.archived,
                        dueDate:
                            !card.due_date ? null :
                                (new Date(card.due_date).getUTCDate() < 10 ? '0' + new Date(card.due_date).getUTCDate() : new Date(card.due_date).getUTCDate()) + "." +
                                (new Date(card.due_date).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.due_date).getUTCMonth() + 1) : new Date(card.due_date).getUTCMonth() + 1) + "." +
                                new Date(card.due_date).getUTCFullYear(),
                        created:
                            !card.created ? null :
                                (new Date(card.created).getUTCDate() < 10 ? '0' + new Date(card.created).getUTCDate() : new Date(card.created).getUTCDate()) + "." +
                                (new Date(card.created).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.created).getUTCMonth() + 1) : new Date(card.created).getUTCMonth() + 1) + "." +
                                new Date(card.created).getUTCFullYear(),
                        doneDate:
                            !card.last_moved_to_done_at ? null :
                                (new Date(card.last_moved_to_done_at).getUTCDate() < 10 ? '0' + new Date(card.last_moved_to_done_at).getUTCDate() : new Date(card.last_moved_to_done_at).getUTCDate()) + '.' +
                                (new Date(card.last_moved_to_done_at).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.last_moved_to_done_at).getUTCMonth() + 1) : new Date(card.last_moved_to_done_at).getUTCMonth() + 1) + '.' +
                                new Date(card.last_moved_to_done_at).getUTCFullYear()
                    }
                }).sort((a, b) => {
                    if (a.title === null) return 1;
                    if (b.title === null) return -1;
                    return a.title.localeCompare(b.title);
                });
            }
            nCoincide = [...resp];

            savedReports = {
                up : upSpace,
                res : {
                    success: true,
                    coincide: coincide,
                    nCoincide: nCoincide,
                    upCoincide : upCoincide,
                    devisions : devisions
                },
                eBoardsIdUp   : eBoardsIdUp,
                eBoardsIdDown : eBoardsIdDown,
                startDate : startDate,
                endDate : endDate,
                form : form
            }

            if( req.body.type === 'page' ){
                return res.send({
                    success: true,
                    coincide: coincide,
                    nCoincide: nCoincide,
                    upCoincide : upCoincide,
                    devisions : devisions
                });
            }else if( req.body.type === 'file' ){
                await collectXLSX( savedReports.res );
            }
        }catch (error) {
            console.log( 'Error in form === 0:' );
            console.log( error );
            res.send({
                success: false,
                response: error.message || error
            });
        }
    }else if( form === 1 ){
        try {
            const upLvl= await fetchAllUpLvlCards(
                '&states=3&last_moved_to_done_at_after=' + startDate  + '&last_moved_to_done_at_before=' + endDate
            );

            const devisions = await fetchData( token, ApiUrl + '/company/custom-properties/75278/select-values');

            coincide.push({
                id : upSpace.id,
                list : []
            })

            for (let upLvlCard of upLvl) {
                let baseUpCard = Object.assign({}, upLvlCard);
                baseUpCard.upLvlCard = Object.assign({}, upLvlCard);
                coincide[0].list.push(baseUpCard);

                await getAllDescendants(baseUpCard.children_ids, baseUpCard);
            }

            coincide[0].list = coincide[0].list.map(card => {
                let devn = null;
                if( card.upLvlCard && card.upLvlCard.properties ){
                    if( card.upLvlCard.properties.id_75278 ){
                        devn = devisions.find( item => item.id === card.upLvlCard.properties.id_75278[0] ).value
                    }
                }

                let responsible = null;
                if( card.members ){
                    let respCheck = card.members.find(item => item.type === 2);
                    if( respCheck ){
                        responsible = {
                            id : respCheck.id,
                            name : respCheck.full_name
                        }
                    }
                }

                let path_data = {};
                if( !card.path_data ){
                    path_data.board = card.board.title || null;
                    path_data.lane = card.lane.title || null;

                    allSpaces.forEach( allSpacesItem => {
                        allSpacesItem.boards.forEach( board => {
                            if( board.id === card.board_id ){
                                path_data.spaceId = allSpacesItem.id;
                                path_data.spaceTitle = allSpacesItem.title;
                            }
                        });
                    });
                }else{
                    path_data.spaceId = card.path_data.space.id || null;
                    path_data.spaceTitle = card.path_data.space.title || null;
                    path_data.board = card.path_data.board.title || null;
                    path_data.lane = card.path_data.lane.title || null;
                }


                if( card.size !== null ){
                    if( Number(card.size) === 0 ){
                        card.size = '0,1'
                    }else{
                        card.size = card.size.toString().replace(/\./g, ',');
                    }
                }else{
                    card.size = '-';
                }
                return {
                    id: card.id,
                    title: card.title,
                    upId: card.upLvlCard.id,
                    upTitle: card.upLvlCard.title,
                    upPath: card.upLvlCard.path_data,
                    upDivision: devn,
                    upBoard: card.upLvlCard.board.title,
                    upArchived : card.upLvlCard.archived,
                    type: card.type.name,
                    space: path_data.spaceTitle,
                    spaceId: path_data.spaceId,
                    board: path_data.board,
                    lane: path_data.lane,
                    size: card.size,
                    responsible: responsible,
                    archived : card.archived,
                    dueDate:
                        !card.due_date ? null :
                            (new Date(card.due_date).getUTCDate() < 10 ? '0' + new Date(card.due_date).getUTCDate() : new Date(card.due_date).getUTCDate()) + "." +
                            (new Date(card.due_date).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.due_date).getUTCMonth() + 1) : new Date(card.due_date).getUTCMonth() + 1) + "." +
                            new Date(card.due_date).getUTCFullYear(),
                    created:
                        !card.created ? null :
                            (new Date(card.created).getUTCDate() < 10 ? '0' + new Date(card.created).getUTCDate() : new Date(card.created).getUTCDate()) + "." +
                            (new Date(card.created).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.created).getUTCMonth() + 1) : new Date(card.created).getUTCMonth() + 1) + "." +
                            new Date(card.created).getUTCFullYear(),
                    doneDate:
                        !card.last_moved_to_done_at ? null :
                            (new Date(card.last_moved_to_done_at).getUTCDate() < 10 ? '0' + new Date(card.last_moved_to_done_at).getUTCDate() : new Date(card.last_moved_to_done_at).getUTCDate()) + '.' +
                            (new Date(card.last_moved_to_done_at).getUTCMonth() + 1 < 10 ? '0' + (new Date(card.last_moved_to_done_at).getUTCMonth() + 1) : new Date(card.last_moved_to_done_at).getUTCMonth() + 1) + '.' +
                            new Date(card.last_moved_to_done_at).getUTCFullYear()
                }
            });

            savedReports = {
                up : upSpace,
                res : {
                    success: true,
                    coincide: coincide,
                    nCoincide: nCoincide,
                    devisions : devisions
                },
                eBoardsIdUp   : eBoardsIdUp,
                eBoardsIdDown : eBoardsIdDown,
                startDate : startDate,
                endDate : endDate,
                form : form
            }

            if( req.body.type === 'page' ){
                res.send({
                    success: true,
                    coincide: coincide,
                    nCoincide: nCoincide,
                    devisions : devisions
                });
            }else if( req.body.type === 'file' ){
                await collectXLSX( savedReports.res );
            }
        }catch (error) {
            console.log( 'Ошибка : ' );
            console.log( error );
            res.send({
                success: false,
                response: error.message || error
            });
        }
    }
});


// -- [ Functions ] --
// Fetch Data
const fetchData = async(token, url) => {
    const options = {
        method: 'GET',
        url: url,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json' ,
            Authorization: 'Bearer ' + token
        }
    };

    try {
        console.log(url);
        const response = await limiter.schedule(() =>
            axios.request(options)
        );
        console.log('Пришло');
        return response.data;
    } catch (error) {
        console.log("Error in fetchData:");
        console.log(error.message || error);
        return (error.message || error) + ", opt : " + options;
    }
}


// -- [ Server ]--
app.use(express.static('dist'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dist/index.html');
});

app.listen(3001, () => {
    console.log('localhost:3001');
    opn('http://localhost:3001');
});
