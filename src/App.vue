<template>
  <div class="form">
      <div class="form_title">
        Softworks
      </div>
      <transition name="slideLeft" mode="out-in">
        <!-- Is Auth -->
        <div v-if="form.result && form.result.full_name" key="b1">
          <div class="l-title">
            Здравствуйте, {{form.result.full_name}} <span @click="logout()" class="logout">X</span>
          </div>
          <transition name="fade" mode="out-in" class="form-content">
            <div class="preloader" key="preloader" v-if="report.spacesStatus === false">
              <img src="@/assets/img/spin-dark.svg">
            </div>
            <div class="form_content" key="content" v-else>
              <div class="form_content-tab">
                <span class="form_content-tab_item"
                      :class="{ 'active' : report.form === 0 }"
                      @click="changeFrom(0)">По дивизионам</span>
                <span class="form_content-tab_item"
                      :class="{ 'active' : report.form === 1 }"
                      @click="changeFrom(1)">Готовые Epic’s</span>
              </div>
              <div class="form_content-cnt" v-if="report.form === 0">
                <div class="two-column">
                  <div class="form_cnt">
                    <div class="m-title">
                      Верхнеуровневое пространство:
                    </div>
                    <div v-for="item in report.spaces"
                         :key="item.id"
                         class="list-spaces_item"
                         :class="{ 'list-spaces_item__active' : item.id === report.selectedSpaces.up.id }">
                      <div class="list-spaces_title"
                           @click="selectSpace(item, 'up')">
                        {{item.title}}
                      </div>
                      <div class="list-boards">
                        <label v-for="board in item.boards" class="custom-checkbox custom-checkbox__small">
                          <input type="checkbox" v-model="board.active">
                          <span class="custom-checkbox_pseudo"></span>
                          {{board.title}}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="form_cnt">
                    <div class="m-title">
                      Подчиненные пространства:
                    </div>
                    <div v-if="Object.entries(report.selectedSpaces.up).length !== 0">
                      <div v-for="(item, itemIdx) in report.spaces"
                           key="itemIdx"
                           class="list-spaces_item"
                           :class="{ 'list-spaces_item__active' : report.selectedSpaces.down.length && report.selectedSpaces.down.find(space => space.id === item.id)  }"
                           v-show="item.id !== report.selectedSpaces.up.id">
                        <div class="list-spaces_title"
                             @click="selectSpace(item, 'down', itemIdx)">
                          {{item.title}}
                        </div>
                        <div class="list-boards">
                          <label v-for="board in item.boards" class="custom-checkbox custom-checkbox__small">
                            <input type="checkbox" v-model="board.active">
                            <span class="custom-checkbox_pseudo"></span>
                            {{board.title}}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="m-title" v-show="report.selectedSpaces.down.length !== 0">
                  <label class="custom-checkbox">
                    <input type="checkbox" v-model="report.needArchive">
                    <span class="custom-checkbox_pseudo"></span>
                    Выгружать архивные карточки
                  </label>
                </div>
                <div class="form_cnt" v-show="report.selectedSpaces.down.length !== 0">
                  <div class="m-title">
                    Период:
                  </div>
                  <div class="form_datepicker">
                    <div>
                      <DatePicker v-model.range="report.dates"
                                  ref="calendar"
                                  locale="ru"
                                  mode="date"/>
                    </div>
                    <div class="form_datepicker-cnt"
                         v-if="report.dates.start !== '' && report.dates.end !== ''">
                      <div class="form_datepicker-item">
                        Дата начала : <br>
                        <b>{{ dateStart }}</b>
                      </div>
                      <div class="form_datepicker-item">
                        Дата окончания : <br>
                        <b>{{ dateEnd }}</b>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="m-title">
                  Собрать:
                </div>
                <div class="form_btns">
                  <button class="btn" type="button" id="collectbtn"
                          :disabled="report.preloader || Object.entries(report.selectedSpaces.up).length === 0 || report.selectedSpaces.down.length === 0"
                          :class="{ 'btn__icon-fix' : report.preloader && report.type === 'page'}"
                          @click="collectReportData('page')">
                    <span>На странице</span>
                    <img src="@/assets/img/spin.svg" class="btn_icon btn_icon__spin">
                  </button>
                  <button class="btn btn_file" type="button"
                          :disabled="report.preloader || Object.entries(report.selectedSpaces.up).length === 0 || report.selectedSpaces.down.length === 0"
                          :class="{ 'btn__icon-fix' : report.preloader && report.type === 'file' }"
                          @click="collectReportData('file')">
                    <span>В файл</span>
                    <img src="@/assets/img/spin.svg" class="btn_icon btn_icon__spin">
                  </button>
                </div>
              </div>
              <div class="form_content-cnt" v-if="report.form === 1">
                <div class="two-column">
                  <div class="form_cnt">
                    <div class="m-title">
                      Верхнеуровневое пространство:
                    </div>
                    <div v-for="item in report.spaces"
                         :key="item.id"
                         class="list-spaces_item"
                         :class="{ 'list-spaces_item__active' : item.id === report.selectedSpaces.up.id }">
                      <div class="list-spaces_title"
                           @click="selectSpace(item, 'up')">
                        {{item.title}}
                      </div>
                      <div class="list-boards">
                        <label v-for="board in item.boards" class="custom-checkbox custom-checkbox__small">
                          <input type="checkbox" v-model="board.active">
                          <span class="custom-checkbox_pseudo"></span>
                          {{board.title}}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="form_cnt">
                    <div class="m-title">
                      Период:
                    </div>
                    <div class="form_datepicker">
                      <div>
                        <DatePicker v-model.range="report.dates"
                                    ref="calendar"
                                    locale="ru"
                                    mode="date"/>
                      </div>
                      <div class="form_datepicker-cnt"
                           v-if="report.dates.start !== '' && report.dates.end !== ''">
                        <div class="form_datepicker-item">
                          Дата начала : <br>
                          <b>{{ dateStart }}</b>
                        </div>
                        <div class="form_datepicker-item">
                          Дата окончания : <br>
                          <b>{{ dateEnd }}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="m-title">
                  Собрать:
                </div>
                <div class="form_btns">
                  <button class="btn" type="button" id="collectbtn"
                          :disabled="report.preloader || Object.entries(report.selectedSpaces.up).length === 0"
                          :class="{ 'btn__icon-fix' : report.preloader && report.type === 'page'}"
                          @click="collectReportData('page')">
                    <span>На странице</span>
                    <img src="@/assets/img/spin.svg" class="btn_icon btn_icon__spin">
                  </button>
                  <button class="btn btn_file" type="button"
                          :disabled="report.preloader || Object.entries(report.selectedSpaces.up).length === 0"
                          :class="{ 'btn__icon-fix' : report.preloader && report.type === 'file' }"
                          @click="collectReportData('file')">
                    <span>В файл</span>
                    <img src="@/assets/img/spin.svg" class="btn_icon btn_icon__spin">
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
        <!-- Isn't Auth -->
        <div class="ta-center" key="b2" v-else>
          <div class="form_descr">
            Введите ключ доступа API
          </div>
          <label class="form-control">
            <input id="token" name="token" type="text" class="form-field" v-model="form.key">
          </label>
          <button class="btn" type="submit"
                  :disabled="!form.key.length || form.preloader"
                  :class="{ 'btn__icon-fix' : form.preloader}"
                  @click="getData('/api/user')">
            <span>Войти</span>
            <img src="@/assets/img/spin.svg" class="btn_icon btn_icon__spin">
          </button>
        </div>
      </transition>
    </div>

  <div class="report-title ta-center" v-if="report.reportStatus && reportEmpty">
    По указанным параметрам ничего не найдено
  </div>
  <div class="report" v-if="report.reportStatus && !reportEmpty">
    <!-- Отчеты(0) -->
    <div class="report-cnt"
         v-if="report.form === 0"
         v-for="(space, spaceIdx) in report.coincide">
      <!-- Совпавшие -->
      <div :key="space.id"
           v-show="space.list.length">
        <div class="report-title ta-center">
          Список совпавших "{{space.name}}"({{space.list.length}}шт)
        </div>
        <table class="report-table">
          <tr>
            <th>id задачи</th>
            <th>Задача</th>
            <th>id верхней задачи</th>
            <th>Название верхней задачи</th>
            <th>Дивизион верхней задачи</th>
            <th>Пространство верхней задачи</th>
            <th>Доска верхней задачи</th>
            <th>Дорожка верхней задачи</th>
            <th>Тип задачи</th>
            <th>Пространство</th>
            <th>Доска</th>
            <th>Дорожка</th>
            <th>Размер</th>
            <th>Ответственный</th>
            <th>id ответственного</th>
            <th>Срок (deadline)</th>
            <th>Дата создания</th>
            <th>Дата вполнения</th>
          </tr>
          <tr v-for="card in space.list"
              :class="{ 'archived' : card.archived }"
              :key="card.id">
            <td>
              <a :href="'https://softworks.kaiten.ru/space/' + card.spaceId + '/card/' + card.id" target="_blank">{{card.id}}</a>
              <div v-show="card.archived">[В архиве]</div>
            </td>
            <td>{{card.title}}</td>
            <td class="upLvl">
              <a :href="'https://softworks.kaiten.ru/space/' + report.selectedSpaces.up.id + '/card/' + card.upId" target="_blank">{{card.upId}}</a>
              <div v-show="card.upArchived">[В архиве]</div>
            </td>
            <td class="upLvl">{{card.upTitle}}</td>
            <td class="upLvl" :class="card.upDivision ? 'upLvl' : 'error'">{{card.upDivision || '-'}}</td>
            <td class="upLvl">{{report.selectedSpaces.up.title}}</td>
            <td class="upLvl">{{card.upBoard}}</td>
            <td class="upLvl">{{card.upPath.lane.title}}</td>
            <td>{{card.type}}</td>
            <td>{{card.space}}</td>
            <td>{{card.board}}</td>
            <td>{{card.lane}}</td>
            <td :class="{ 'error' : card.size === '-' }">{{card.size}}</td>
            <td :class="{ 'error' : !card.responsible }">{{card.responsible ? card.responsible.name : '-'}}</td>
            <td :class="{ 'error' : !card.responsible }">{{card.responsible ? card.responsible.id : '-'}}</td>
            <td>{{card.dueDate || '-'}}</td>
            <td>{{card.created || '-'}}</td>
            <td>{{card.doneDate || '-'}}</td>
          </tr>
        </table>
      </div>
      <!-- Несовпавшие -->
      <div class="report-cnt"
           :key="report.nCoincide[spaceIdx].id"
           v-show="report.nCoincide[spaceIdx].list.length > 0">
        <div class="report-title ta-center">
          Родительская карточка отсутствует "{{report.nCoincide[spaceIdx].name}}"({{report.nCoincide[spaceIdx].list.length}}шт)
        </div>
        <table class="report-table">
          <tr>
            <th>id задачи</th>
            <th>Задача</th>
            <th>Info</th>
            <th>Тип задачи</th>
            <th>Пространство</th>
            <th>Доска</th>
            <th>Дорожка</th>
            <th>Размер</th>
            <th>Ответственный</th>
            <th>id ответственного</th>
            <th>Срок (deadline)</th>
            <th>Дата создания</th>
            <th>Дата вполнения</th>
          </tr>
          <tr v-for="card in report.nCoincide[spaceIdx].list"
              :class="{ 'archived' : card.archived }"
              :key="card.id">
            <td>
              <a :href="'https://softworks.kaiten.ru/space/' + report.selectedSpaces.up.id + '/card/' + card.id" target="_blank">{{card.id}}</a>
              <div v-show="card.archived">[В архиве]</div>
            </td>
            <td>{{card.title}}</td>
            <td class="error"><span>Нет родителя</span></td>
            <td>{{card.type}}</td>
            <td>{{card.space}}</td>
            <td>{{card.board}}</td>
            <td>{{card.lane}}</td>
            <td :class="{ 'error' : card.size === '-' }">{{card.size}}</td>
            <td :class="{ 'error' : !card.responsible }">{{card.responsible ? card.responsible.name : '-'}}</td>
            <td :class="{ 'error' : !card.responsible }">{{card.responsible ? card.responsible.id : '-'}}</td>
            <td>{{card.dueDate || '-'}}</td>
            <td>{{card.created || '-'}}</td>
            <td>{{card.doneDate || '-'}}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Отчеты(1) -->
    <div class="report-cnt"
         v-if="report.form === 1"
         v-for="(space, spaceIdx) in report.coincide">
      <div :key="spaceIdx"
           v-show="space.list.length">
        <div class="report-title ta-center">
          "{{space.name}}"({{space.list.length}}шт)
        </div>
        <table class="report-table">
          <tr>
            <th>id верхней задачи</th>
            <th>Название верхней задачи</th>
            <th>Дивизион верхней задачи</th>
            <th>Пространство верхней задачи</th>
            <th>Доска верхней задачи</th>
            <th>Дорожка верхней задачи</th>
            <th>id задачи</th>
            <th>Задача</th>
            <th>Пространство</th>
            <th>Доска</th>
            <th>Дорожка</th>
            <th>Тип задачи</th>
            <th>Размер</th>
            <th>Ответственный</th>
            <th>id ответственного</th>
            <th>Срок (deadline)</th>
            <th>Дата создания</th>
            <th>Дата вполнения</th>
          </tr>
          <tr v-for="card in space.list"
              :class="{ 'archived' : card.archived, 'separeted' : card.id === card.upId }"
              :key="card.id">
            <td class="upLvl">
              <a :href="'https://softworks.kaiten.ru/space/' + report.selectedSpaces.up.id + '/card/' + card.upId"
                 v-if="card.id === card.upId"
                 target="_blank">{{card.upId}}</a>
              <div v-show="card.id === card.upId && card.upArchived">[В архиве]</div>
            </td>
            <td class="upLvl">
              <span v-if="card.id === card.upId">{{card.upTitle}}</span>
            </td>
            <td class="upLvl" :class="card.upDivision ? 'upLvl' : 'error'">
              <span v-if="card.id === card.upId">{{card.upDivision || '-'}}</span>
            </td>
            <td class="upLvl">
              <span v-if="card.id === card.upId">{{report.selectedSpaces.up.title}}</span>
            </td>
            <td class="upLvl">
              <span v-if="card.id === card.upId">{{card.upBoard}}</span>
            </td>
            <td class="upLvl">
              <span v-if="card.id === card.upId">{{card.upPath.lane.title}}</span>
            </td>
            <td>
              <a :href="'https://softworks.kaiten.ru/space/' + card.spaceId + '/card/' + card.id" target="_blank"
                 v-if="card.id !== card.upId">{{card.id}}</a>
              <div v-show="card.id !== card.upId && card.archived">[В архиве]</div>
            </td>
            <td>
              <span v-if="card.id !== card.upId">{{card.title}}</span>
            </td>
            <td>
              <span v-if="card.id !== card.upId">{{card.space}}</span>
            </td>
            <td>
              <span v-if="card.id !== card.upId">{{card.board}}</span>
            </td>
            <td>
              <span v-if="card.id !== card.upId">{{card.lane}}</span>
            </td>
            <td>{{card.type}}</td>
            <td :class="{ 'error' : card.size === '-' }">{{card.size}}</td>
            <td :class="{ 'error' : !card.responsible }">{{card.responsible ? card.responsible.name : '-'}}</td>
            <td :class="{ 'error' : !card.responsible }">{{card.responsible ? card.responsible.id : '-'}}</td>
            <td>{{card.dueDate || '-'}}</td>
            <td>{{card.created || '-'}}</td>
            <td>{{card.doneDate || '-'}}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Готовые верхнеуровневые -->
    <div class="report-cnt"
         v-show="report.upCoincide && report.upCoincide.length">
      <div class="report-title ta-center">
        Задачи с верхнеуровненого пространства
      </div>
      <table class="report-table">
        <tr>
          <th>id задачи</th>
          <th>Задача</th>
          <th>Дивизион</th>
          <th>Тип задачи</th>
          <th>Пространство</th>
          <th>Доска</th>
          <th>Дорожка</th>
          <th>Размер</th>
          <th>Ответственный</th>
          <th>id ответственного</th>
          <th>Срок (deadline)</th>
          <th>Дата создания</th>
          <th>Дата вполнения</th>
        </tr>
        <tr v-for="card in report.upCoincide"
            :key="card.id">
          <td>
            <a :href="'https://softworks.kaiten.ru/space/' + report.selectedSpaces.up.id + '/card/' + card.id" target="_blank">{{card.id}}</a>
            <div v-show="card.archived">[В архиве]</div>
          </td>
          <td>{{card.title}}</td>
          <td>
            <span>{{card.upDivision}}</span>
          </td>
          <td>{{card.type.name}}</td>
          <td>{{card.path_data.space.title}}</td>
          <td>{{card.path_data.board.title}}</td>
          <td>{{card.path_data.lane.title}}</td>
          <td :class="{ 'error' : !card.size }">{{card.size || '-'}}</td>
          <td :class="{ 'error' : !card.responsible }">{{ card.responsible ? card.responsible.name : '-' }}</td>
          <td :class="{ 'error' : !card.responsible }">{{ card.responsible ? card.responsible.id : '-' }}</td>
          <td>{{card.dueDate || '-'}}</td>
          <td>{{card.created || '-'}}</td>
          <td>{{card.last_moved_to_done_at || '-'}}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="alerts">
    <transition-group name="fade">
      <div class="alerts_item"
           :class="{ error : item.type === 'error' }"
           :key="indX"
           v-for="(item, indX) in alerts">
        {{item.msg}}
      </div>
    </transition-group>
  </div>
</template>

<script>
import { onBeforeMount, ref} from 'vue'
import {Calendar, DatePicker} from 'v-calendar';
import 'v-calendar/style.css';
import moment from 'moment';

export default {
  setup(){
    // ---- [ Data ] ----
    // Calendar
    const calendar = ref(null);

    // Alerts
    const alerts = ref([]);

    // Form Auth
    const form = ref({
      key : '',
      result : false,
      preloader : false
    });

    // Report
    const report = ref({
      spaces : [],
      spacesStatus : false,
      reportStatus : false,
      needArchive : false,
      preloader : true,
      type : '',
      form : 0,
      selectedSpaces : {
        up : {},
        down : []
      },
      dates : {
        start : new Date(new Date().setMonth(new Date().getMonth() - 1)),
        end : new Date()
      },
      coincide : [],
      nCoincide : [],
      devisions : []
    });

    // ---- [ Main Function ]----
    // Check Auth | Get Spaces
    onBeforeMount(() => {
      if( document.cookie.length ){
        form.value.key = getCookieValue('token');
        form.value.result = { full_name : getCookieValue('user') };

        getData('/api/spaces');
      }
    });

    // Select Space
    const selectSpace = function ( item, type, itemIdx ){
      if( type === 'up' ){
        report.value.selectedSpaces.down = [];
        report.value.selectedSpaces.up = item;
      }else if( type === 'down' ){
        let index = report.value.selectedSpaces.down.findIndex(space => space.id === item.id);

        if (index !== -1) {
          report.value.selectedSpaces.down.splice(index, 1);
        } else {
          item.order = itemIdx;
          report.value.selectedSpaces.down.push(item);
        }
      }
    }

    // Get Data
    const getData = async function (url) {
      const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' + url : url;

      if( url === '/api/user'){
        form.value.preloader = true;
      }

      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + form.value.key
          },
        });
        const resp = await response.json();
        formatData(url, resp);
      } catch (error) {
        UnforeseenError(error);
      }
    }
    // Post Data
    const postData = async function ( data, url ) {
      const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' + url : url;

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + form.value.key
          },
          body : JSON.stringify(data)
        });

        if( data.type === 'file' ){
          let resp;
          if (response.ok) {
            resp = await response.blob();
            formatFile(resp);
          }
        }else{
          let resp = await response.json()
          formatData(url, resp);
          report.value.reportStatus = true;
        }
        report.value.preloader = false;
      } catch (error) {
        UnforeseenError(error);
      }
    }

    // Check Data
    const formatData = function (name, response){
      if( response.success ){
        if( name === '/api/user' ){ // User
          form.value.result = response.response;
          form.value.preloader = false;
          document.cookie = "token=" + form.value.key + "; SameSite=Lax";
          document.cookie = "user=" + response.response.full_name + "; SameSite=Lax";

          getData('/api/spaces');
        }else if( name === '/api/spaces'){ // Spaces
          report.value.spacesStatus = true;
          report.value.preloader = false;
          report.value.spaces = response.spaces.map( space => {
            space.boards = space.boards.map( board => {
              board.active = true;
              return board;
            });
            return space
          });
        }else if( name.split('?')[0] === '/api/report' ){
          report.value.coincide = response.coincide.map( item => {
            item.name = report.value.spaces.find( space => Number(item.id) === space.id).title
            return item
          });
          report.value.nCoincide = response.nCoincide.map( item => {
            item.name = report.value.spaces.find( space => Number(item.id) === space.id).title
            return item
          });
          report.value.devisions = response.devisions;
          report.value.upCoincide = response.upCoincide;
          report.value.preloader = false;

          setTimeout( () => {
            window.scrollTo({
              top: document.getElementById('collectbtn').getBoundingClientRect().x,
              behavior: 'smooth'
            });
          }, 500);
        }
      }else{
        if( response.status === 401 ){
          getAlert('Неверный токен', 'error' );
        }else if( response.status === 403 ){
          getAlert('Вам запрещен доступ к ресурсу', 'error' );
        }else if( response.code === 'ERR_INVALID_CHAR' ){
          getAlert('Токен содержит неверные символы', 'error' );
        }
      }
    }
    // Format File
    const formatFile = function ( res ){
      let filename = report.value.selectedSpaces.up.title.substring(0, 2) + "-";

      report.value.selectedSpaces.down.forEach( (space, spaceIndex) => {
        if( spaceIndex > 0 ){
          filename += ','
        }
        filename += space.title.substring(0, 2);
      });     

      filename += '_' + moment(report.value.dates.start).format('DD.MM.YYYY');
      filename += '_' + moment(report.value.dates.end).format('DD.MM.YYYY');

      let url = window.URL.createObjectURL(res);
      let a = document.createElement('a');
      a.href = url;
      a.download = filename + '.xlsx';
      a.click();
    }

    // Report Data
    const collectReportData = function ( type ){
      report.value.preloader = true;
      report.value.type = type;
      report.value.coincide = [];
      report.value.nCoincide = [];
      report.value.reportStatus = false;

      let eBoardsIdUp = [];
      for( let board of report.value.selectedSpaces.up.boards ){
        if( !board.active ){
          eBoardsIdUp.push(board.id)
        }
      }

      let data = {
        up: report.value.selectedSpaces.up,
        type: type,
        form: report.value.form,
        start: new Date(report.value.dates.start.setUTCHours(0, 0, 0, 0)).toISOString(),
        end: new Date(report.value.dates.end.setUTCHours(23, 59, 59, 999)).toISOString(),
        eBoardsIdUp : eBoardsIdUp
      };

      if( report.value.form === 0 ){
        let eBoardsIdDown = [];
        for( let space of report.value.selectedSpaces.down ){
          for( let board of space.boards ){
            if( !board.active ){
              eBoardsIdDown.push(board.id)
            }
          }
        }

        data.down = report.value.selectedSpaces.down.map( space => ({
          id : space.id,
          title : report.value.spaces.find( item => item.id === space.id).title
        }))
        data.archived = report.value.needArchive;
        data.eBoardsIdDown = eBoardsIdDown;
      }

      postData( data, '/api/report');
    }


    // ---- [ Secondary Functions] ----
    // Error
    const UnforeseenError = function (error) {
      console.log( error.message || error );
      getAlert('Непредвиденная ошибка', 'error')
    }

    // Get Alert
    const getAlert = function ( msg, type){
      alerts.value.push({ type : type, msg : msg });
      setTimeout( () => { alerts.value.shift() }, 3000);
    }

    // Cookie
    const getCookieValue = (name) => {
      let row = document.cookie.split('; ').find(row => row.startsWith(name + '='));
      return row ? row.split('=')[1] : undefined;
    }

    // Logout
    const logout = () => {
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      location.reload();
    }

    return {
      form,
      alerts,
      report,
      calendar,
      logout,
      getCookieValue,
      getAlert,
      UnforeseenError,
      formatData,
      getData,
      selectSpace,
      collectReportData
    }
  },
  computed : {
    reportEmpty(){
      let res = true;

      if( this.report.coincide.length ){
        for( let space of this.report.coincide ){
          if( space.list.length ){
            res = false;
            break;
          }
        }
      }
      if( res === false && this.report.nCoincide.length ){
        for( let space of this.report.nCoincide ){
          if( space.list.length ){
            res = false;
            break;
          }
        }
      }

      return res;
    },
    dateStart(){
      return moment( this.report.dates.start ).format('DD.MM.YYYY');
    },
    dateEnd(){
      return moment( this.report.dates.end ).format('DD.MM.YYYY');
    }
  },
  methods : {
    changeFrom( idx ){
      this.report.form = idx;

      this.report.reportStatus = false;
      this.report.coincide = [];
      this.report.nCoincide = [];
    }
  },
  components : {
    Calendar,
    DatePicker
  },
};
</script>
