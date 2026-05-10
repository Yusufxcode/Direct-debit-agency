import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private nibbsUrl = 'https://vas.heirsinsurance.com/NIBSSMANDATE'
  private paythruUrl = 'https://services.paythru.ng/debit'
  private localUrl = 'http://localhost:5273/api/v1'

  constructor(
    private readonly http: HttpClient
  ) { }


  getBanks() {
    const https =  this.httpClientHeaders()
    return this.http.get(this.nibbsUrl + '/api/Mandate/banks', https)
  }

  verifyAccount(payload: {}) {
    const https =  this.httpClientHeaders()
    return this.http.post(this.nibbsUrl + '/api/Mandate/verifyAccount', payload, https)
  }

  productList() {
    const https =  this.payThruHeaders()
    return this.http.get(this.paythruUrl + '/api/v1/Product/list', https)
  }

  createMandate(payload: {}) {
    const https =  this.httpClientHeaders()
    return this.http.post(this.localUrl + '/createMandate', payload, https)
  }

  private httpClientHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };
  }

  private payThruHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'ApplicationId': '47e2b1f89a3d4c5eb12a7f8d9e0a1b2cbc91a28374654f3e8d2c1b0a9f8e7d6c_'
      }),
    };
  }
}
