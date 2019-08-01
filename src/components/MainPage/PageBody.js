import React, { Component } from "react";
import PropTypes from "prop-types";
import { DragDropContext } from "react-beautiful-dnd";
import Board from "./Board";
import Sidebar from "./Sidebar";
import YearPicker from "./YearPicker";

import axios from "axios";
import API from "../../config/api";
axios.defaults.withCredentials = true;

const coursesUrl = `${API.courses}/`;
const termsUrl = `${API.terms}/`;
const boardsUrl = `${API.boards}/`;
const columnsUrl = `${API.columns}/`;
const cardsUrl = `${API.cards}/`;

const initialData = {
    board: {
        board: {},
        columns: {}
    },
    searchBody: [],
    searchValue: "",
    yearPickerVisible: false
};

class PageBody extends Component {
    constructor(props) {
        super(props);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.state = initialData;
        this.state.userId = this.props.id;

        this.courses = [];
        this.courseNames = [];
    }

    componentWillMount() {
        this.initBoard();
        this.getCourses();
    }

    // Board-handling methods

    initBoard() {
        axios.get(boardsUrl + `user/${this.state.userId}`)
            .then(res => {
                res = res.data;
                if (res.ok) {
                    let board = res.body.board;
                    if (board) {
                        this.getBoard(board);
                    } else {
                        this.setState({yearPickerVisible: true});
                    }
                } else {
                    console.log(res.message);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    // Returning User Flow

    getBoard(board) {
        const boardId = board._id;
        axios.get(columnsUrl + `board/${boardId}`)
            .then(res => {
                res = res.data;
                if (res.ok) {
                    const columns = res.body.columns;
                    this.getColumns(columns, board);
                } else {
                    console.log(res.message);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    getColumns(columns, board) {
        let newBoard = {
            board: board,
            columns: {}
        };
        for (let column of columns) {
            axios.get(cardsUrl + `column/${column._id}`)
                .then(cardRes => {
                    cardRes = cardRes.data;
                    if (cardRes.ok) {
                        newBoard.columns[column._id] = {
                            column: column,
                            cards: cardRes.body.cards
                        };
                        if (Object.keys(newBoard.columns).length === columns.length) {
                            this.setState({board: newBoard});
                        }
                    } else {
                        console.log(cardRes.message);
                    }
                })
                .catch(err => {
                    console.log(err);
                })
        }
    }

    // New User Flow

    onYearPickerSubmit(startYear, endYear) {
        this.postBoard(startYear.value, endYear.value);
        this.setState({yearPickerVisible: false});
    }

    postBoard(startYear, endYear) {
        axios.post(boardsUrl + `user/${this.state.userId}`)
            .then(res => {
                res = res.data;
                if (res.ok) {
                    this.getTerms(res.body.board, startYear, endYear);
                } else {
                    console.log(res.message);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    getTerms(board, startYear, endYear) {
        axios.get(termsUrl)
            .then(res => {
                res = res.data;
                if (res.ok) {
                    const termNames = this.modifyTerms(res.body.terms, startYear, endYear);
                    this.addRowOfColumns(board, termNames);
                } else {
                    console.log(res.message);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    termName(year, seasonIndex) {
        const seasons = ["Fall", "Winter", "Spring", "Summer"];
        return `${year} ${seasons[seasonIndex]}`;
    }

    modifyTerms(terms, startYear, endYear) {
        terms = terms.sort((a, b) => a.id - b.id);
        const termNames = terms.map(term => term.name);

        const startName = this.termName(startYear, 0),
              endName = this.termName(endYear + 1, 3);
        const startIndex = termNames.indexOf(startName),
              endIndex = termNames.indexOf(endName);
        
        if (startIndex === -1) {
            terms = [];
            terms.push({id: 0, name: startName});
        } else if (endIndex === -1) {
            terms = terms.slice(startIndex);
        } else {
            terms = terms.slice(startIndex, endIndex + 1);
        }

        const seasons = ["Fall", "Winter", "Spring", "Summer"];
        while (terms[terms.length - 1].name !== endName) {
            const prevItem = terms[terms.length - 1];
            const prevSeason = prevItem.name.slice(5);
            const nextSeasonIndex = (seasons.indexOf(prevSeason) + 1) % seasons.length;
            const year = parseInt(prevItem.name.slice(0, 4), 10) + (nextSeasonIndex === 1 ? 1 : 0);
            terms.push({
                id: prevItem.id + 10,
                name: this.termName(year, nextSeasonIndex)
            });
        }
        return terms.map(term => term.name);
    }

    addRowOfColumns(board, termNames) {
        board = {
            board: board,
            columns: {}
        }
        let columnsAdded = 0;
        const callback = columnRes => {
            columnRes = columnRes.data;
            if (columnRes.ok) {
                const column = columnRes.body.column;
                board.columns[column._id] = {
                    column: column,
                    cards: []
                };
                if (++columnsAdded === termNames.length) {
                    this.setState({board: board});
                }
            } else {
                console.log(columnRes.message);
            }
        }
        for (let term of termNames) {
            axios.post(columnsUrl + `board/${board.board._id}`, {name: term})
                .then(columnRes => callback(columnRes))
                .catch(err => {
                    console.log(err);
                });
        }
    }

    // Course-handling and Search methods

    getCourses() {
        axios.get(coursesUrl)
            .then(res => {
                res = res.data;
                if (res.ok) {
                    const courses = res.body.courses;
                    this.courses = courses;
                    this.searchStrings = courses.map(course => this.displayString(course).toLowerCase());
                } else {
                    console.log(res.message);
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    onSearchChange(e) {
        const searchValue = e.target.value;
        let searchBody = [];
        if (searchValue) {
            const courses = this.courses,
                  searchStrings = this.searchStrings,
                  termLowerCase = searchValue.toLowerCase();
            for (let i = 0; i < this.courses.length; i++) {
                if (searchStrings[i].includes(termLowerCase)) {
                    searchBody.push({
                        _id: courses[i]._id,
                        course: courses[i]
                    });
                }
            }
        }
        this.setState({searchBody, searchValue});
    }

    displayString(course) {
        return `${course.subject.symbol} ${course.catalog_num}: ${course.title}`;
    }

    // Card Manipulation Methods

    onDragEnd(result) {
        const { destination, source } = result;
        if (!(destination && source)) { return; }

        let columns = this.state.board.columns;
        columns.searchBody = {
            cards: this.state.searchBody
        }

        const sourceId = source.droppableId;
        const destId = destination.droppableId;

        let sourceColumnCards = columns[sourceId].cards;
        let destColumnCards = columns[destId].cards;

        const card = sourceColumnCards.splice(source.index, 1)[0];
        destColumnCards.splice(destination.index, 0, card);
    
        columns[sourceId].cards = sourceColumnCards;
        columns[destId].cards = destColumnCards;

        if (this.isSearchBody(destId) && columns.searchBody.cards.length <= 1) {
            this.setState({searchBody: []});
        } else {
            this.setState({searchBody: columns.searchBody.cards});
        }
        Reflect.deleteProperty(columns, "searchBody");

        let board = this.state.board;
        board.columns = columns;
        this.setState({board: board});

        this.handleCardMove(card, sourceId, destId);
    }

    handleCardMove(card, sourceId, destId) {
        if (!this.isSearchBody(sourceId) && this.isSearchBody(destId)) {
            axios.delete(cardsUrl + card._id)
                .catch(err => {
                    console.log(err);
                });
        } else if (!this.isSearchBody(sourceId) && !this.isSearchBody(destId)) {
            axios.patch(cardsUrl + `column/${destId}`, {
                cardId: card._id
            })
                .catch(err => {
                    console.log(err);
                });
        } else if (this.isSearchBody(sourceId) && !this.isSearchBody(destId)) {
            axios.post(cardsUrl + `column/${destId}`, {
                course: card.course._id
            })
                .then(res => {
                    res = res.data;
                    if (res.ok) {
                        let board = this.state.board;
                        const cards = board.columns[destId].cards;
                        for (let i in cards) {
                            if (cards[i]._id === res.body.card.course) {
                                cards[i]._id = res.body.card._id;
                                board.columns[destId].cards = cards;
                                break;
                            }
                        }
                        this.setState({board: board});
                    } else {
                        console.log(res.message);
                    }
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }

    isSearchBody(id) {
        return id === "searchBody";
    }

    render() {
        return (
            <div className="PageBody">
                {this.state.yearPickerVisible? 
                    <YearPicker onSubmit={this.onYearPickerSubmit.bind(this)}/> : 
                    <DragDropContext onDragEnd={this.onDragEnd}>
                        <Board columns={this.state.board.columns}/>
                        <Sidebar value={this.state.searchValue}
                                column={this.state.searchBody}
                                onChange={e => this.onSearchChange(e)}/>
                    </DragDropContext>}
            </div>
        )
    }
}

PageBody.propTypes = {
    id: PropTypes.string
}

export default PageBody;