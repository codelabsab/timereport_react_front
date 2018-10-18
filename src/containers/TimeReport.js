import React, { Component } from 'react';
import NameSelectionComponent from '../components/NameSelectionComponent';
import DatePicker from '../components/DatePicker';
import TimeReportTable from '../components/TimeReportTable';
import * as AuthService from '../services/AuthService';
import * as WebService from '../services/WebService';
import * as StorageService from '../services/StorageService';
import * as TimeReportBuildService from '../services/TimeReportBuildService';
import { NotifyContainer, NotifyService } from '../services/NotifyService';

export default class TimeReport extends Component {
  constructor(props) {
    super(props);
    this.state = { timeReportData: [] };
    StorageService.resetAccessToken();
    let verificationCode = AuthService.getVerificationCode(props.location.search);
    let accessTokenUrl = AuthService.getAccessTokenUrl(verificationCode);
    WebService.getAccessToken(accessTokenUrl)
      .then((response) => {
        if (AuthService.validateAccessToken(response)) {
          //use team_id instead of access_token
          StorageService.setAccessToken(response.team_id);
          this.getUsersAndDatePickers();
        }
      })
      .catch(this.handleError);
  }

  getUsersAndDatePickers = () => WebService.getUsers()
    .then(users => this.setState({ users: users }))
    .catch(this.handleError);

  handleError = (e) => {
    let errorMessage = 'Error : ' + (e.message || 'Error Occured');
    NotifyService.notify(errorMessage);
  }

  handleInUserNameChange = (userName) => this.setState({ user: userName });

  handleInDateChange(datePeriod) {
    let query = {
      startDate: datePeriod.startDate,
      endDate: datePeriod.endDate,
      userName: this.state.user
    };
    WebService.getTimeReport(query)
      .then(data => this.setState({ timeReportData: TimeReportBuildService.buildTimeReportData(data) }))
      .catch(this.handleError);
  }

  handleInTimeReportChange(change, action) {
    if (action === 'ADD') {
      let changeToBeadded = TimeReportBuildService.buildTimeReportSingle({
        id: (new Date()).getTime(),
        user_name: change.user_name,
        type_id: change.type_id,
        start: change.start,
        hours: change.hours,
      });

      WebService.createTimeReport(change)
        .then(response => console.log(response))
        .catch(this.handleError);

      let timeReportDataWithAddedUser = this.state.timeReportData.concat([changeToBeadded]);
      this.setState({ timeReportData: timeReportDataWithAddedUser });
    }

    if (action === 'DELETE') {
      let timeReportDataExceptDeleted = this.state.timeReportData.filter(t => t.id !== change.id);
      WebService.deleteTimeReport(change)
        .then(response => {
          console.log(response);
          this.setState({ timeReportData: timeReportDataExceptDeleted });
        })
        .catch(this.handleError);

    }

    if (action === 'EDIT') {
      let timeReportMapped = this.state.timeReportData.map(t => {
        if (t.id === change.id)
          t.setEditable(true);
        return t;
      });
      this.setState({ timeReportData: timeReportMapped });
    }

    if (action === 'EDIT_DONE') {
      let timeReportMapped = this.state.timeReportData.map(t => {
        if (t.id === change.id) {
          t.setEditable(false);
          t.type_id = change.type_id;
          t.start = change.start;
          t.hours = change.hours;
        }
        return t;
      });

      WebService.updateTimeReport(change)
        .then(response => {
          console.log(response);
          this.setState({ timeReportData: timeReportMapped });
        })
        .catch(this.handleError);

    }
  }

  render() {
    const marginStyle = { marginTop: '1rem' };
    if (!this.state.users)
      return (<div><NotifyContainer /></div>);
    return (
      <div style={marginStyle}>
        <div className="input-group">
          <div className="input-group-prepend">
            <label className="input-group-text">
              <span className="oi oi-person"></span> &nbsp;&nbsp;Select User:
            </label>
          </div>
          <NameSelectionComponent
            users={this.state.users}
            onChangeUserName={(name) => this.handleInUserNameChange(name)} />

          <DatePicker onDateChange={(datePeriod) => this.handleInDateChange(datePeriod)} />

          <div style={{ width: '35rem' }}></div>
        </div>

        <TimeReportTable data={this.state.timeReportData}
          showNewRow={this.state.showNewRow}
          onAdd={() => this.setState({ showNewRow: !this.state.showNewRow })}
          onChange={(change, action) => this.handleInTimeReportChange(change, action)}
        />

        <NotifyContainer />
      </div>
    );
  }
}
